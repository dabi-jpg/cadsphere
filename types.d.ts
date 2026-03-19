declare module 'occt-import-js' {
  interface OcctMesh {
    attributes: {
      position: { array: Float32Array };
      normal?: { array: Float32Array };
    };
    index: { array: Uint32Array };
    color?: [number, number, number];
  }

  interface OcctResult {
    meshes: OcctMesh[];
    success: boolean;
  }

  interface OcctInstance {
    ReadStepFile(path: string): OcctResult;
    ReadIgesFile(path: string): OcctResult;
    FS: {
      createDataFile(
        parent: string,
        name: string,
        data: Uint8Array,
        canRead: boolean,
        canWrite: boolean,
        canOwn: boolean
      ): void;
      unlink(path: string): void;
    };
  }

  interface OcctOptions {
    locateFile?: (file: string) => string;
  }

  export default function initOpenCascade(options?: OcctOptions): Promise<OcctInstance>;
}

declare module 'three/examples/jsm/loaders/STLLoader.js' {
  import { STLLoader } from 'three-stdlib';
  export { STLLoader };
}
