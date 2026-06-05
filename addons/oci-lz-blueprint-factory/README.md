# **OCI Landing Zone Blueprint Factory** <!-- omit from toc -->

## **Understanding the Blueprint Factory Pattern**

&nbsp;

**Table of Contents**

[1. Overview](#1-overview)<br>
[1.1. Access Paths: With or Without AI](#11-access-paths-with-or-without-ai)<br>
[2. Core Concepts](#2-core-concepts)<br>
[3. Blueprint Factory Architecture](#3-blueprint-factory-architecture)<br>
[3.1. Generation Modes](#31-generation-modes)<br>
[3.2. Factory Components](#32-factory-components)<br>
[4. Generation Workflow](#4-generation-workflow)<br>
[4.1. Default Mode](#41-default-mode)<br>
[4.2. Config Mode](#42-config-mode)<br>
[5. Blueprint Composition](#5-blueprint-composition)<br>
[5.1. Hub Models](#51-hub-models)<br>
[5.2. Environments and Platforms](#52-environments-and-platforms)<br>
[5.3. Workload Extensions](#53-workload-extensions)<br>
[6. Using the Blueprint Factory](#6-using-the-blueprint-factory)<br>
[6.1. Published Blueprints](#61-published-blueprints)<br>
[6.2. Creating Custom Blueprints](#62-creating-custom-blueprints)<br>
[6.3. Extending Blueprints](#63-extending-blueprints)<br>
[7. Best Practices](#7-best-practices)<br>

&nbsp;

## 1. Overview

The **OCI Landing Zone Blueprint Factory** is the core generation engine that creates and manages infrastructure blueprints for Oracle Cloud Infrastructure deployments. It transforms declarative configuration inputs into complete, deployable landing zone artifacts while maintaining consistency, security, and traceability.

The Blueprint Factory operates on a **factory pattern** principle:
- Takes **structured configuration** as input
- Applies **repository-owned templates and builders**
- Produces **consistent, deployable JSON artifacts**
- Enables **iterative refinement** with full version control

This addon explains how the Blueprint Factory works, its architecture, and how to use it effectively.

&nbsp;

### 1.1 Access Paths: With or Without AI

The Blueprint Factory is a **standalone, independent component** that can be used in multiple ways:

<p align="center">
  <img src="images/workflow.png" alt="Three step flow for AI guided Operating Entities setup" width="600">
</p>

**Access paths:**
- **Path 1 (With AI):** User describes needs → AI Agent creates config → Factory generates custom landing zone
- **Path 2 (Direct):** DevOps teams write config directly → Factory generates custom landing zone
- **Path 3 (Published):** Users select pre-built blueprints from repository → Deploy directly

Paths 1 and 2 feed the Factory for custom generation. Path 3 users consume published blueprints that already exist in the repository—no Factory interaction needed.

&nbsp;

## 2. Core Concepts

### 2.1 Blueprints

A **Blueprint** is a complete, deployable landing zone design including:
- Network topology (VCNs, subnets, gateways, routing)
- Identity and Access Management (IAM compartments, groups, policies)
- Security configuration (security lists, network security groups)
- Governance tags and naming conventions
- Optional: Observability, monitoring, and extensions

### 2.2 Jsonnet as the Configuration Language

**Jsonnet** is a data templating language that extends JSON with:
- Variables and functions for reusability
- Conditional logic for flexible configurations
- Composition and merging for template inheritance
- Comments and self-documenting configuration

Example:
```jsonnet
{
  region: "us-phoenix-1",
  environments: {
    dev: { cidr: "10.0.0.0/16" },
    prod: { cidr: "10.10.0.0/16" }
  }
}
```

### 2.3 Profiles vs Configurations

**Profiles** are repository-owned canonical configurations for published blueprints:
- Located in `gen/blueprints/one-oe/runtime/one-stack/profiles.libsonnet`
- Define standard deployments (Hub A, Hub B, etc.)
- Used for default mode generation
- Pre-validated and version-controlled

**Configurations** are customer-owned customizations:
- Created by customers for their specific requirements
- Used in config mode generation
- Can combine published patterns with custom variations
- Subject to customer review and governance

### 2.4 Template Builders

**Builders** are Jsonnet functions that generate specific resource types:
- Network builder: VCNs, subnets, gateways, routing rules
- IAM builder: Compartments, groups, policies, identity domains
- Security builder: Security lists, NSGs, Cloud Guard
- Governance builder: Tags, tag namespaces, naming conventions
- Hub builders: Hub-specific topologies (Hub A, B, C, E)
- Extension builders: Workload-specific resources (OKE, ExaCS, etc.)

&nbsp;

## 3. Blueprint Factory Architecture

### 3.1 Generation Modes

```
gen/generate.sh
    ↓
    ├─→ [Default Mode]
    │   ├─ Scan all .jsonnet entrypoints under gen/
    │   ├─ Import profiles.libsonnet (repository-owned)
    │   ├─ Call landing_zone.libsonnet
    │   └─ Output JSON files (mirrored directory structure)
    │
    └─→ [Config Mode]
        ├─ Accept user-supplied config.libsonnet
        ├─ Call landing_zone_multi.jsonnet
        ├─ Normalize and compose full landing zone
        └─ Output all files to specified directory
```

### 3.2 Factory Components

**Core Files:**
- `gen/generate.sh` - Entry point, mode selection, file discovery
- `gen/landing_zone.libsonnet` - Main orchestrator and composition engine
- `gen/landing_zone_multi.jsonnet` - Config mode wrapper
- `gen/config.libsonnet` - Configuration normalization and auto-subnet calculation

**Builders:**
- `gen/hub/` - Hub model builders (Hub A, B, C, E)
- `gen/builders/network.libsonnet` - VCN and network resources
- `gen/builders/iam.libsonnet` - Identity and access management
- `gen/builders/security.libsonnet` - Security configurations
- `gen/builders/governance.libsonnet` - Tags and governance

**Extensions:**
- `gen/workload-extensions/oke/` - Kubernetes extension
- `gen/workload-extensions/exacs/` - Exadata extension
- `gen/workload-extensions/exacc/` - Exadata on Cloud@Customer extension

**Helpers:**
- `gen/naming.libsonnet` - Unified naming conventions
- `gen/topology.libsonnet` - Topology semantics and validation
- `gen/constants.libsonnet` - OCI realm-specific constants
- `gen/lib/cidrs.libsonnet` - CIDR validation and management
- `gen/lib/validation.libsonnet` - Common validation functions

&nbsp;

## 4. Generation Workflow

### 4.1 Default Mode

**Command:** `bash gen/generate.sh`

**Process:**
1. Scan all `.jsonnet` files under `gen/` (excluding `landing_zone_multi.jsonnet`)
2. For each entrypoint:
   - Load the local `profiles.libsonnet` (repository-owned defaults)
   - Invoke `landing_zone.libsonnet` with the profile configuration
   - Select specific output fields (network, iam, security, governance, observability)
3. Format each JSON output
4. Write to corresponding published location (mirrors `gen/` structure)

**Use Case:** Regenerating published blueprints that are checked into the repository.

**Output Structure:**
```
blueprints/one-oe/runtime/one-stack/
├── oneoe_network.json
├── oneoe_iam.json
├── oneoe_security.json
├── oneoe_governance.json
└── oneoe_observability.json
```

### 4.2 Config Mode

**Command:** `bash gen/generate.sh --config my_config.libsonnet [output_dir]`

**Process:**
1. Load user-supplied configuration file
2. Normalize configuration via `config.libsonnet`:
   - Validate required fields
   - Auto-calculate subnets when omitted
   - Apply defaults for hub and spoke topology
3. Build shared context:
   - Naming conventions for the region
   - Topology semantics (environments, platforms, targeting)
   - Constants for OCI service names
4. Invoke builders to compose all outputs:
   - Network (hub + spokes + integrations)
   - IAM (compartments, groups, policies)
   - Security (security lists, NSGs, Cloud Guard)
   - Governance (tags, naming)
   - Observability (optional: logging, alarms, monitoring)
5. Format each JSON output
6. Write all files to specified output directory

**Use Case:** Creating customized landing zones with specific requirements.

**Output Files:**
```
output/
├── network.json           # VCN topology
├── iam.json              # Compartments, groups, policies
├── security_primary.json # Default security
├── governance.json       # Tags and governance
└── [optional] others...
```

&nbsp;

## 5. Blueprint Composition

### 5.1 Hub Models

The Blueprint Factory supports multiple hub (DMZ) models:

| Hub Model | Use Case | Firewall | Public LB | Routing |
|-----------|----------|----------|-----------|---------|
| **Hub A** | Traditional firewall-based with public ingress | NF | ✅ | Static routes + BGP ready |
| **Hub B** | Modern design with Network Firewall | NF | ✅ | DRG and advanced routing |
| **Hub C** | Advanced hub with multiple layers | NF | ✅ | Extended DRG with backends |
| **Hub E** | Minimal non-production design | None | Optional | Basic routing |

Each hub model is built by specialized builders under `gen/hub/`:
- `hub_a.libsonnet` - Hub A topology
- `hub_b.libsonnet` - Hub B topology
- `hub_c.libsonnet` - Hub C topology
- `hub_e.libsonnet` - Hub E topology

### 5.2 Environments and Platforms

**Environments** are operational contexts (dev, staging, prod):
- Each environment gets its own spoke VCN
- Environments can have isolated platforms or shared platforms
- Environment-specific IAM groups and policies

**Platforms** are infrastructure abstractions within environments:
- **Shared Platforms:** Across environments (databases, shared services)
- **Environment Platforms:** Specific to one environment (application tier)
- **Workload Extensions:** Network-producing extensions (OKE, ExaCS)

**Projects** organize applications within an environment:
- Each project gets its own network scope
- Projects have separate IAM controls
- Suitable for multi-tenant or multi-application deployments

### 5.3 Workload Extensions

Extensions add specialized infrastructure for specific workloads:

**OKE (Kubernetes):**
- Creates node pool networks
- Configures service and pod CIDRs
- Sets up integration with landing zone IAM
- Supports single-stack or multi-stack deployments

**ExaCS (Exadata on Infrastructure):**
- Creates infrastructure and network scopes
- Manages database subnets and backup subnets
- Supports shared or per-environment placement
- Configures AVMC/VMC integration

**ExaCC (Exadata on Cloud@Customer):**
- Integration points for on-premises Exadata
- IAM and observability configuration
- Cross-connect and routing setup

&nbsp;

## 6. Using the Blueprint Factory

### 6.1 Published Blueprints

For standard, pre-built deployments, use published blueprints:

**One-OE One-Stack Path:**
```bash
# Check runtime documentation
cat blueprints/one-oe/runtime/one-stack/readme.md

# Review specific hub guide
cat blueprints/one-oe/runtime/one-stack/one_oe_hub_b.md

# Deploy using published JSON
# Use with Terraform or OCI Resource Manager
```

Published blueprints are:
- ✅ Pre-validated and tested
- ✅ Documented with specific hub guides
- ✅ Ready to deploy immediately
- ✅ Include known issues and caveats

### 6.2 Creating Custom Blueprints

For customized requirements, use config mode:

**Step 1: Create Configuration File**
```jsonnet
// my_landing_zone.libsonnet
{
  region_short_name: "phx",
  hub_model: "hub_b",
  
  environments: {
    dev: {
      name: "development",
      vcn_cidr: "10.0.0.0/16",
    },
    prod: {
      name: "production",
      vcn_cidr: "10.10.0.0/16",
    }
  },
  
  shared_platforms: {
    exacs: {
      network: {
        primary_subnet_cidr: "10.100.0.0/24",
        backup_subnet_cidr: "10.100.1.0/24"
      }
    }
  }
}
```

**Step 2: Generate Landing Zone**
```bash
bash gen/generate.sh --config my_landing_zone.libsonnet ./output
```

**Step 3: Review Generated Files**
```bash
# Check network topology
cat output/network.json

# Check IAM structure
cat output/iam.json

# Review all artifacts before deployment
```

**Step 4: Deploy**
```bash
# Using Terraform CLI
cd output
terraform init
terraform plan
terraform apply

# OR using OCI Resource Manager (stage files in private bucket first)
```

### 6.3 Extending Blueprints

Extend existing blueprints by modifying configurations:

**Add a New Environment:**
```jsonnet
environments: {
  dev: { ... },
  staging: {  // New environment
    name: "staging",
    vcn_cidr: "10.5.0.0/16",
  },
  prod: { ... }
}
```

**Add a Workload Extension:**
```jsonnet
environments: {
  dev: {
    platforms: {
      oke: {
        display_name: "OKE Cluster",
        network: {
          cidr: "10.1.0.0/20",
          service_cidr: "172.16.0.0/16",
          pod_cidr: "10.244.0.0/16"
        }
      }
    }
  }
}
```

**Add Projects for Multi-Tenant:**
```jsonnet
environments: {
  prod: {
    projects: [
      { name: "proj1", vcn_cidr: "10.11.0.0/24" },
      { name: "proj2", vcn_cidr: "10.11.1.0/24" }
    ]
  }
}
```

&nbsp;

## 7. Best Practices

### 7.1 Configuration Management

- **Version Control:** Keep Jsonnet configs in Git with your IaC
- **Review Process:** All config changes go through code review before generation
- **Documentation:** Comment why non-obvious choices are made
- **Separation:** Keep config separate from generated outputs
- **Reusability:** Create shared config snippets for common patterns

### 7.2 Generation and Validation

- **Review Before Deploy:** Always review generated JSON artifacts
- **Diff Inspection:** Compare successive generations to catch unintended changes
- **CIDR Validation:** Confirm no overlaps with connected networks
- **Naming Convention:** Verify resources follow organizational standards
- **Dry-Run:** Use `terraform plan` before `terraform apply`

### 7.3 Lifecycle Management

- **Day 1:** Generate and deploy landing zone
- **Day 2:** Manage updates through config changes and regeneration
- **Versioning:** Tag Terraform modules and generated configs
- **Drift Detection:** Use Cloud Guard and Config rules to detect drift
- **GitOps:** Automate deployment from repository using CI/CD

### 7.4 Extension Selection

- **OKE:** Choose when Kubernetes is the primary workload
- **ExaCS:** Add when managed Exadata infrastructure is needed
- **Custom:** Keep non-supported resources as manual post-deployment steps

### 7.5 Hub Model Selection

- **Hub A:** Traditional network design with firewall
- **Hub B:** Modern design with Network Firewall and flexible routing
- **Hub C:** Advanced design for complex routing and multi-layer setup
- **Hub E:** Non-production, minimal footprint designs only

&nbsp;

## Additional Resources

- [Generator README](../../gen/README.md) - Technical details on Jsonnet generator
- [Generator Architecture (gen/AGENTS.md)](../../gen/AGENTS.md) - Deep dive into generation patterns
- [Config-Driven Generation Guide](../../commons/content/config-driven.md) - Step-by-step config mode walkthrough
- [One-OE Runtime Documentation](../../blueprints/one-oe/runtime/one-stack/readme.md) - Published blueprint reference
- [Jsonnet Official Documentation](https://jsonnet.org/) - Jsonnet language reference

&nbsp;

#### License

Copyright (c) 2026 Oracle and/or its affiliates.

Licensed under the Universal Permissive License (UPL), Version 1.0.

See [LICENSE](../../LICENSE.txt) for more details.
