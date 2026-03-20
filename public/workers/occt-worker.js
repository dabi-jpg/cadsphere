let occtModule = null;

async function initOcct() {
  if (occtModule) return occtModule;
  // Use the lowercase name as found in the literal file
  self.importScripts("/occt-import-js.js");
  occtModule = await occtimportjs({
    locateFile: (path) => {
      if (path.endsWith(".wasm")) return "/occt-import-js.wasm";
      return path;
    },
  });
  return occtModule;
}

self.onmessage = async function (e) {
  const { fileBuffer, ext, id } = e.data;

  try {
    const occt = await initOcct();

    const result =
      ext === ".igs" || ext === ".iges"
        ? occt.ReadIgesFile(fileBuffer, null)
        : occt.ReadStepFile(fileBuffer, null);

    if (!result?.success || !result?.meshes?.length) {
      self.postMessage({
        id,
        success: false,
        error: result?.error || "No meshes found",
      });
      return;
    }

    // Extract transferable data
    const meshes = result.meshes.map((mesh) => ({
      positions: mesh.attributes.position.array,
      normals: mesh.attributes.normal?.array || null,
      indices: Array.from(mesh.index.array),
      color: mesh.color || null,
    }));

    self.postMessage({ id, success: true, meshes });
  } catch (err) {
    self.postMessage({
      id,
      success: false,
      error: err instanceof Error ? err.message : "Worker error",
    });
  }
};
