# Multi-OE Generic Runtime

This runtime is generated from Jsonnet source under `gen/blueprints/multi-oe/generic/runtime`.

This runtime deploys the generated Multi-OE landing zone in one Terraform state.

Do not hand-edit JSON files in this tree. Update the Jsonnet source and run `bash gen/generate.sh`.

This runtime publishes Project Type A only: projects share the environment project subnets and are isolated with project NSGs.
