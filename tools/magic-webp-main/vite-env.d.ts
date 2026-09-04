/// <reference types="vite/client" />

// Vite worker imports
declare module '*?worker&url' {
  const workerUrl: string;
  export default workerUrl;
}

declare module '*?worker' {
  const WorkerConstructor: new () => Worker;
  export default WorkerConstructor;
}

// WASM module imports
declare module '*.mjs' {
  const content: any;
  export default content;
}

// Asset imports with ?url suffix
declare module '*?url' {
  const url: string;
  export default url;
}

