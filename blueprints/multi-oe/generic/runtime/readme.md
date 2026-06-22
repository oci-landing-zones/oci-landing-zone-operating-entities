# Multi-OE Generic Runtime

This runtime is generated from Jsonnet source under `gen/blueprints/multi-oe/generic/runtime`.

## Runtime Families

- [Single-stack](./single-stack/readme.md): deploys the generated Multi-OE landing zone in one Terraform state.
- [Multi-stack](./multi-stack/readme.md): deploys the generated Multi-OE landing zone through OP01 shared services, OP02 OE onboarding, and OP03 project onboarding state boundaries.

Do not hand-edit JSON files in this tree. Update the Jsonnet source and run `bash gen/generate.sh`.

This runtime publishes Project Type A only: projects share the environment project subnets and are isolated with project NSGs.
