# PNG benchmark

Run the benchmark with:

```sh
pnpm benchmark
```

The benchmark generates three valid 1×1 PNG/APNG buffers in memory:

- A 15.3 MiB animated PNG with 850 metadata chunks after its first `fdAT`
- A 521-byte animated PNG
- A 31.2 MiB static PNG

No image assets are stored in the repository. File size comes from valid `tEXt`
metadata, while the image data is generated with Node.js.

The runner compares the PNG implementation before the early return with the
current implementation, verifies that both return the same result, and prints
median timings as a Markdown table.
