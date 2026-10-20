# Local Set-up

The `gen/` Jsonnet implementation powers the [Blueprint Factory](../addons/oci-lz-blueprint-factory/README.md). This contributor guide uses implementation terms such as generator, config mode, and Jsonnet where technical precision is required.

Run `bash gen/generate.sh` the first time you work on the generator. It sets up the repo hooks, checks that a Jsonnet renderer is installed, and regenerates the checked-in outputs.

Regular clones, submodules, and linked Git worktrees are supported. Hook paths are resolved through Git; an existing `core.hooksPath` is preserved so a custom dispatcher can invoke the repository hooks. Repository-owned installed hooks are updated; an unrelated hook in Git's default hook directory is preserved and reported as a conflict. Both hooks check the current branch every time they run and return immediately on the exact `content` branch, including when installed before switching branches. Explicitly running the generator still generates files on that branch.

## Documentation Map

- [`../AGENTS.md`](../AGENTS.md): repo-specific workflow rules and generator guardrails.
- [`../addons/oci-lz-blueprint-factory/blueprint-factory-configuration-reference.md`](../addons/oci-lz-blueprint-factory/blueprint-factory-configuration-reference.md): customer-facing supported configuration shapes and field behavior.
- [`AGENTS.md`](AGENTS.md): architecture, schema, naming rules, publication rules, and stable generator contracts.
- [`JSONNET_COMPOSITION.md`](JSONNET_COMPOSITION.md): how the Jsonnet files compose and where to edit for common change types.
- [`../tests/gen/`](../tests/gen/): generator test modules and fixtures.

## Generator Workflow

- Default generation: `bash gen/generate.sh`
- Config mode: `bash gen/generate.sh --config <config_file> [output_dir]`
- Raw config-mode fan-out and debugging: `jsonnet --multi <output_dir>/ --tla-code-file config=<config_file> gen/landing_zone_multi.jsonnet`

Config-mode network artifacts use one canonical final file: `network.json`. Managed NFW/NLB route targets use resource keys.
Generate a regional DR design as two independent configs. The complete home config owns the RPC acceptor and sets `dr_region` for the DR Object Storage key-use grant; the regional DR config owns the RPC requester. Run `--config` once for each source and use separate output directories. Regional scope supports platforms and registered workload extensions and emits their workload, network, security, and observability contributions. CIS2 creates regional Vaults and keys. Shared IAM and governance prerequisites must already exist in the complete home stack; cross-tenancy RPCs remain rejected in regional scope.
Config-mode security and observability artifacts follow `cis_level`: omit it for the default CIS level 2 files, or set `cis_level: 1` to emit the CIS level 1 file pair instead.
Config-mode extension outputs are emitted as additional files from `result.extra`; for example, OKE emits `oke_clusters.json` and `oke_workers.json`.
If you set `hub.network.subnets` explicitly, provide the full canonical subnet set for that hub kind; partial hub subnet overrides are rejected during normalization.
For networked extension-backed platforms, explicit `platform.network.subnets` overrides must match the extension metadata-defined subnet set exactly; otherwise omit subnets and let the extension auto-allocate. Extensions declare network behavior with `metadata.network_mode`: `required`, `forbidden`, or `optional`. Optional-network extensions may omit `platform.network` for IAM/observability-only contributions, or include it to contribute an internal `network` fragment to the final network.
Generated IAM is checked against a 400-statement safety budget per root-to-leaf
compartment chain. OCI documents a hard limit of 500 statements per chain; this
repo keeps headroom for customer extensions and manual policies.

### Project networks and dedicated subnets

`project_network` is optional. Omit `project_network.network.subnets` for the
default `web`, `app`, `db`, and `infra` shared subnets; use `{}` for none; a
non-empty map is exact. Declare project-dedicated subnet allocations under
`projects.<name>.subnets`. All subnet CIDRs must be canonical, contained by the
VCN, and non-overlapping.

Dedicated subnet allocation is not an IAM boundary. Subnet access is governed at
the environment network compartment, and the factory does not generate
per-subnet IAM conditions. Use dedicated allocations for separate CIDR and
operational management. Prefer shared subnets for address efficiency.

`subnet_routing` defaults to `vcn`. Set `hub` with Hub A, B, or C to route
traffic between different subnets through the hub firewall; Hub E rejects it.
Same-subnet traffic remains local and requires NSGs and security lists. Hub C
requires real firewall backend targets in place of the generated non-working placeholders. NLB backends support VM primary and qualified secondary-interface keys; see the [Hub C backend contract](../addons/oci-hub-models/hub_c/readme.md#backend-targets).

Change the Jsonnet sources under `gen/` first. Checked-in JSON under `blueprints/` and `workload-extensions/` are generated snapshots, not hand-maintained source files.

Use `jsonnet --multi` only for config-mode output fan-out and debugging. Do not use it to regenerate committed snapshot families.

## Generator Tests

Run the generator suite from the repository root with:

```bash
python3 -m unittest discover -s tests -p 'test_*.py'
```

These tests require `jsonnet` on `PATH`.

# Jsonnet Quick Reference

## What is Jsonnet?

Jsonnet is a data templating language that extends JSON with powerful features for generating configuration files. It eliminates duplication, enables code reuse, and makes complex configurations manageable.

## Core Language Features

### Variables

```jsonnet
local region = "us-ashburn-1";
local env = "prod";
{
  compartment_name: env + "-" + region  // Result: "prod-us-ashburn-1"
}
```

### Imports

```jsonnet
local utils = import "utils.libsonnet";
local config = import "base-config.jsonnet";

config + { extra_field: utils.helper() }
```

### Object Field Operators: `:` vs `+:`

**`:` (standard field)** - Defines a new field or overwrites an existing one:

```jsonnet
local base = { port: [80], value: 1 };
base + { port: [90]}
// Result: { port: [90], value: 1 }
```

**`+:` (append field)** - Merges with an existing field instead of replacing:

```jsonnet
local base = {
  tags: { env: "dev" },
  ports: [80, 443]
};

base + {
  tags+: { region: "us" },    // Merges objects
  ports+: [8080]              // Concatenates arrays
}
// Result: {
//   tags: { env: "dev", region: "us" },
//   ports: [80, 443, 8080]
// }
```

**`::` (hidden field)** - Field not included in output JSON:

```jsonnet
{
  internal_var:: "hidden",
  public_field: "visible"
}
// Result: { public_field: "visible" }
```

### Object Composition and Merging

```jsonnet
local defaultConfig = {
  vcn_cidr: "10.0.0.0/16",
  dns_label: "default"
};

local prodConfig = defaultConfig + {
  dns_label: "prod",
  enable_monitoring: true
};
// Result: {
//   vcn_cidr: "10.0.0.0/16",
//   dns_label: "prod",
//   enable_monitoring: true
// }
```

### Self-Reference in Objects

```jsonnet
{
  name: "my-vcn",
  display_name: "VCN-" + self.name,
  cidr: "10.0.0.0/16"
}
```

### Functions

```jsonnet
local makeSubnet(name, cidr) = {
  display_name: name,
  cidr_block: cidr,
  dns_label: std.strReplace(name, "-", "")
};

{
  subnet: makeSubnet("web-subnet", "10.0.1.0/24")
}
```

### Conditionals

```jsonnet
local isProd = true;
{
  instance_count: if isProd then 5 else 1,
  shape: if isProd then "VM.Standard.E4.Flex" else "VM.Standard.E2.1"
}
```

### Arrays and Comprehensions

```jsonnet
local regions = ["us-ashburn-1", "us-phoenix-1"];
{
  vcns: [
    {
      name: "vcn-" + region,
      region: region
    }
    for region in regions
  ]
}
```

### Generating Dynamic Object Keys

```jsonnet
local subnets = ["public", "private", "database"];
{
  [subnet + "_subnet"]: {
    display_name: subnet + "-subnet",
    cidr: "10.0.%d.0/24" % [i]
  }
  for i in std.range(0, std.length(subnets) - 1)
  for subnet in [subnets[i]]
}
```

## Common Standard Library Functions

### Object Operations

```jsonnet
std.objectFields({ a: 1, b: 2 })  // ["a", "b"]
std.objectHas(obj, "field_name")   // true/false
```

### Array Operations

```jsonnet
std.map(function(x) x * 2, [1, 2, 3])     // [2, 4, 6]
std.filter(function(x) x > 2, [1, 2, 3])  // [3]
std.join(", ", ["a", "b", "c"])           // "a, b, c"
std.range(1, 5)                           // [1, 2, 3, 4, 5]
std.length([1, 2, 3])                     // 3
```

### String Operations

```jsonnet
std.format("Hello %s", ["World"])         // "Hello World"
std.split("a,b,c", ",")                   // ["a", "b", "c"]
std.startsWith("prefix-name", "prefix")   // true
std.strReplace("hello-world", "-", "_")   // "hello_world"
```

## Practical Patterns

### Reusable Templates with Hidden Fields

```jsonnet
// templates.libsonnet
{
  securityList(name, rules):: {
    display_name: name,
    egress_security_rules: rules.egress,
    ingress_security_rules: rules.ingress
  }
}

// main.jsonnet
local templates = import "templates.libsonnet";
templates.securityList("web-sl", { egress: [...], ingress: [...] })
```

### Deep Merging with `+:`

```jsonnet
local base = {
  compartments: {
    network: { name: "network" }
  }
};

base + {
  compartments+: {
    security: { name: "security" }  // Adds to compartments
  }
}
// Result: Both network and security compartments exist
```

## References

- [Jsonnet Official Documentation](https://jsonnet.org/)
- [Language Reference](https://jsonnet.org/ref/language.html)
- [Standard Library](https://jsonnet.org/ref/stdlib.html)
