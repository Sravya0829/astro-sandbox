// physics.worker.ts

export type WorkerInit = {
  type: "init";
  G: number; // AU^3 / (M☉ * day^2)
  softening2: number;
  bodies: {
    massSolar: number;
    pos: [number, number];
    vel: [number, number];
  }[];
};

export type WorkerStep = {
  type: "step";
  dtDays: number;
  substeps?: number;
};

export type WorkerStateMsg = {
  type: "state";
  pos: Array<[number, number]>;
};

export type WorkerAdd = {
  type: "add";
  body: {
    massSolar: number;
    pos: [number, number]; // AU
    vel: [number, number]; // AU/day
  };
};
export type WorkerReset = { type: "reset"; bodies: WorkerInit["bodies"] };

export type WorkerMsg = WorkerInit | WorkerStep | WorkerAdd | WorkerReset;


type V2 = [number, number];
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const add = (a: V2, b: V2): V2 => [a[0] + b[0], a[1] + b[1]];
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const addScaled = (a: V2, b: V2, s: number): V2 => [a[0] + b[0] * s, a[1] + b[1] * s];
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const sub = (a: V2, b: V2): V2 => [a[0] - b[0], a[1] - b[1]];
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const scale = (a: V2, s: number): V2 => [a[0] * s, a[1] * s];

let G = 0.00029591220828559;
let soft2 = 1e-6;
let masses: number[] = [];
let pos: V2[] = [];
let vel: V2[] = [];
let acc: V2[] = [];

function computeAccel() {
  const n = pos.length;
  for (let i = 0; i < n; i++) {
    let ax = 0, ay = 0;
    for (let j = 0; j < n; j++) {
      if (i === j) continue;
      const dx = pos[j][0] - pos[i][0];
      const dy = pos[j][1] - pos[i][1];
      const r2 = dx * dx + dy * dy + soft2;
      const invR = 1 / Math.sqrt(r2);
      const invR3 = invR * invR * invR;
      const s = G * masses[j] * invR3;
      ax += s * dx;
      ay += s * dy;
    }
    acc[i] = [ax, ay];
  }
}

function step(dt: number, substeps = 1) {
  const h = dt / substeps;

  for (let _ = 0; _ < substeps; _++) {
    // a(t) already computed from last call (or init). Keep a copy.
    const accOld = acc.map((a) => [a[0], a[1]] as V2);

    // 1) x(t+h) = x(t) + v(t)*h + 0.5*a(t)*h^2
    const hh = 0.5 * h * h;
    for (let i = 0; i < pos.length; i++) {
      pos[i][0] += vel[i][0] * h + accOld[i][0] * hh;
      pos[i][1] += vel[i][1] * h + accOld[i][1] * hh;
    }

    // 2) a(t+h)
    computeAccel();

    // 3) v(t+h) = v(t) + 0.5*(a(t) + a(t+h))*h
    const halfh = 0.5 * h;
    for (let i = 0; i < vel.length; i++) {
      vel[i][0] += (accOld[i][0] + acc[i][0]) * halfh;
      vel[i][1] += (accOld[i][1] + acc[i][1]) * halfh;
    }
  }
}

self.onmessage = (ev: MessageEvent<WorkerMsg>) => {
  const msg = ev.data;
  if (msg.type === "init") {
    G = msg.G;
    soft2 = msg.softening2;
    masses = msg.bodies.map((b) => b.massSolar);
    pos = msg.bodies.map((b) => [b.pos[0], b.pos[1]]);
    vel = msg.bodies.map((b) => [b.vel[0], b.vel[1]]);
    acc = new Array(pos.length).fill(0).map(() => [0, 0]);

    computeAccel();

    (self as DedicatedWorkerGlobalScope).postMessage({
      type: "state",
      pos,
    } as WorkerStateMsg);
    return;
  }
  if (msg.type === "step") {
    step(msg.dtDays, msg.substeps ?? 1);
    (self as DedicatedWorkerGlobalScope).postMessage({
      type: "state",
      pos,
    } as WorkerStateMsg);
    return;
  }

  if (msg.type === "add") {
    masses.push(msg.body.massSolar);
    pos.push([msg.body.pos[0], msg.body.pos[1]]);
    vel.push([msg.body.vel[0], msg.body.vel[1]]);
    acc.push([0, 0]);
    computeAccel();
    (self as DedicatedWorkerGlobalScope).postMessage({ type: "state", pos } as WorkerStateMsg);
    return;
    }

    if (msg.type === "reset") {
    masses = msg.bodies.map((b) => b.massSolar);
    pos = msg.bodies.map((b) => [b.pos[0], b.pos[1]]);
    vel = msg.bodies.map((b) => [b.vel[0], b.vel[1]]);
    acc = new Array(pos.length).fill(0).map(() => [0, 0]);
    computeAccel();
    (self as DedicatedWorkerGlobalScope).postMessage({ type: "state", pos } as WorkerStateMsg);
    return;
    }
};
