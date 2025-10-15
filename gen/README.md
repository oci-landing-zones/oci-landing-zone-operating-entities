# Local Set-up

To configure generation using Jsonnet `./gen/generate.sh` needs to be run for the first time manualy. This will set-up git pre-commith hooks, verify jsonnet is installed and generate files from jsonnet

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
