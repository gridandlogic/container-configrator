# Local model optimization measurements

Measured across 36 catalog and fold-out roof/cutaway views, using the same procedural assets and nominal room configurations.

| Scene measure | Before | After | Reduction |
| --- | ---: | ---: | ---: |
| Visible mesh submissions | 8797 | 3860 | 56.1% |
| Rendered triangles | 1570140 | 917148 | 41.6% |
| Unique geometry buffer bytes | 142313680 | 79032752 | 44.5% |
| Material objects | 1368 | 860 | 37.1% |
| 15 finish texture files, bytes | 8953038 | 312602 | 96.5% |

Mesh submissions count visible objects before camera frustum culling; real draw calls vary with the chosen view. Geometry bytes exclude textures, programs and driver allocations. These are model complexity measurements, not FPS or loading-time guarantees. Build timings vary with system load, so no CPU-time speedup is claimed.

Reproduce the current scene measurements with:

`node scripts/profile-models.mjs node_modules/.cache/models-after.json`

The original measurements were captured before this optimization pass in the ignored cache. Safety checks use `node scripts/check-catalog.mjs` and cover 45 model assemblies and door actions, complete furnishings, window/entry bounds and catalog resizing.
