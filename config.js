/*
 * MEMORY — settings
 * ------------------------------------------------------------------
 * This is the only file you need to edit when the marker or the object changes.
 * Files themselves live in the  content/  folder.
 *
 * Units in AR: the marker is 1 unit wide.
 *   x  → right along the marker,   y → up along the marker (towards its top edge),
 *   z  → straight out of the surface (height above the plinth).
 */
window.MEMORY_CONFIG = {

  marker: {
    // Compiled marker made from the photo (tools/marker-compiler.html creates it)
    file: 'content/marker.mind',
  },

  model: {
    // glTF binary (.glb). Y-up, as exported by Blender/most 3D tools by default.
    file: 'content/model.glb',

    // Size of the object's largest dimension, relative to the marker width.
    // 0.38 = a little over a third of the black square.
    size: 0.38,

    // Where the object's centre floats, relative to the centre of the marker.
    position: { x: 0.04, y: 0, z: 0.56 },

    // Extra rotation in degrees, if the object needs to face another way in AR.
    rotation: { x: 0, y: 0, z: 0 },

    spinSeconds: 40,   // one full turn in AR, in seconds. 0 = no spin
    float: 0.02,       // gentle up-and-down movement in AR. 0 = none
    shadow: true,      // soft shadow on the marker under the object

    // The 3D viewer on the home page
    viewer: {
      angle: 50,       // camera height, degrees above the horizon (0 = side view, 90 = from above)
      autoSpin: true,  // slow spin when nobody touches it
    },
  },

  // Hint shown in the camera view until the marker is found
  hint: {
    fr: 'Cadrez tout le carré noir',
    en: 'Frame the whole black square',
  },
};
