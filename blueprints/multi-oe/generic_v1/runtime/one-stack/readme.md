# Multi-OE Generic V1 One-Stack Runtime

This folder contains generated Jsonnet snapshots for the modern Multi-OE Generic V1 one-stack runtime.

The source of truth is under:

- `gen/blueprints/multi-oe/generic_v1/runtime/one-stack/profiles.libsonnet`
- `gen/blueprints/multi-oe/generic_v1/runtime/one-stack/*.jsonnet`
- shared generator code under `gen/`

Do not hand-edit the JSON files in this folder. Update the Jsonnet source and run:

```bash
bash gen/generate.sh
```

The legacy operation-split runtime folders under `generic_v1/runtime/op01_manage_shared_services`, `op02_manage_oes`, `op03_manage_department`, and `op04_manage_projects` remain available for historical deployments. They are not the source of truth for this generated one-stack runtime.
