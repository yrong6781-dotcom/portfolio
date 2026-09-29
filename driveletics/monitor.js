// Driveletics · in-browser driver monitoring (MediaPipe Face Landmarker, runs fully on-device).
// Loaded on demand from app.js. Emits per-frame metrics + discrete fatigue events:
//   'long'  — eyes closed ≥ 0.8 s (micro-sleep signal), then 'hold' every extra second
//   'yawn'  — mouth wide open ≥ 1.0 s
import { FaceLandmarker, FilesetResolver } from './assets/mediapipe/vision_bundle.mjs';

// thresholds are personalised: the first CALIB_MS of face frames set the open-eye / closed-mouth baseline
const CALIB_MS = 2500;
let eyeThr = 0.5, jawThr = 0.5, calib = null; // calib = { t0, eyes: [], jaw: [] } while calibrating
const LONG_MS = 800;
const YAWN_MS = 1000;
const PERCLOS_WINDOW_MS = 30000; // demo-sized window (real systems use ~60 s)

let landmarker, stream, video, raf, onUpdate;
let closedSince = 0, lastHold = 0, longFired = false;
let jawSince = 0, yawnFired = false;
let samples = [];            // [t, closed]
let blinks = 0, longs = 0, yawns = 0, wasClosed = false;

async function createLandmarker() {
  const fileset = {
    wasmLoaderPath: new URL('./assets/mediapipe/vision_wasm_internal.js', import.meta.url).href,
    wasmBinaryPath: new URL('./assets/mediapipe/vision_wasm_internal.wasm', import.meta.url).href,
  };
  const opts = (delegate) => ({
    baseOptions: { modelAssetPath: new URL('./assets/mediapipe/face_landmarker.task', import.meta.url).href, delegate },
    runningMode: 'VIDEO',
    numFaces: 1,
    outputFaceBlendshapes: true,
  });
  try {
    return await FaceLandmarker.createFromOptions(fileset, opts('GPU'));
  } catch (e) {
    return FaceLandmarker.createFromOptions(fileset, opts('CPU'));
  }
}

function score(cats, name) {
  const c = cats.find((x) => x.categoryName === name);
  return c ? c.score : 0;
}

function loop() {
  raf = requestAnimationFrame(loop);
  if (!video || video.readyState < 2) return;
  const now = performance.now();
  const res = landmarker.detectForVideo(video, now);
  const cats = res.faceBlendshapes && res.faceBlendshapes[0] ? res.faceBlendshapes[0].categories : null;
  if (!cats) { onUpdate({ face: false }); closedSince = 0; jawSince = 0; return; }

  const eyeL = score(cats, 'eyeBlinkLeft'), eyeR = score(cats, 'eyeBlinkRight');
  const eyes = (eyeL + eyeR) / 2;
  const jaw = score(cats, 'jawOpen');

  if (calib) {
    if (!calib.t0) calib.t0 = now;
    calib.eyes.push(eyes); calib.jaw.push(jaw);
    if (now - calib.t0 < CALIB_MS) { onUpdate({ face: true, eyes, jaw, calibrating: true }); return; }
    const med = (a) => a.slice().sort((x, y) => x - y)[Math.floor(a.length / 2)];
    const eb = med(calib.eyes), jb = med(calib.jaw);
    eyeThr = Math.min(0.85, Math.max(0.45, eb + 0.3));
    jawThr = Math.min(0.8, Math.max(0.45, jb + 0.35));
    calib = null;
    samples = []; blinks = 0; longs = 0; yawns = 0;
  }
  const closed = eyeL > eyeThr && eyeR > eyeThr;
  let event = null;

  // eyes
  if (closed) {
    if (!closedSince) { closedSince = now; lastHold = now; longFired = false; }
    const dur = now - closedSince;
    if (!longFired && dur >= LONG_MS) { longFired = true; longs++; event = 'long'; lastHold = now; }
    else if (longFired && now - lastHold >= 1000) { lastHold = now; event = 'hold'; }
  } else {
    if (wasClosed && closedSince && now - closedSince < LONG_MS) blinks++;
    closedSince = 0;
  }
  wasClosed = closed;

  // yawn
  if (jaw > jawThr) {
    if (!jawSince) { jawSince = now; yawnFired = false; }
    if (!yawnFired && now - jawSince >= YAWN_MS) { yawnFired = true; yawns++; event = event || 'yawn'; }
  } else jawSince = 0;

  // PERCLOS over the window
  samples.push([now, closed]);
  while (samples.length && now - samples[0][0] > PERCLOS_WINDOW_MS) samples.shift();
  const perclos = samples.filter((s) => s[1]).length / samples.length;

  onUpdate({ face: true, eyes, jaw, closed, yawning: jaw > jawThr, closedFor: closedSince ? now - closedSince : 0, perclos, blinks, longs, yawns, event, eyeThr, jawThr });
}

export async function start(videoEl, cb) {
  onUpdate = cb;
  video = videoEl;
  if (!landmarker) landmarker = await createLandmarker();
  stream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480, facingMode: 'user' }, audio: false });
  video.srcObject = stream;
  await video.play();
  samples = []; blinks = 0; longs = 0; yawns = 0;
  calib = { t0: 0, eyes: [], jaw: [] };
  closedSince = 0; jawSince = 0;
  loop();
}

export function stop() {
  cancelAnimationFrame(raf);
  if (stream) stream.getTracks().forEach((t) => t.stop());
  stream = null;
  if (video) video.srcObject = null;
}
