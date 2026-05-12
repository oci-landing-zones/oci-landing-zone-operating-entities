# ExaDB-C@C WE Set-up <!-- omit from toc -->

## **Table of Contents** <!-- omit from toc -->

- [**1. Summary**](#1-summary)
- [**2. Design Overview**](#2-design-overview)
- [**3. Deployment Options**](#3-deployment-options)
  - [**Choosing the Right Approach**](#choosing-the-right-approach)

&nbsp;

## **1. Summary**

Welcome to the ExaDB-C@C Landing Zone Workload Extension (WE).

The ExaDB-C@C Landing Zone Workload Extension is a secure cloud environment, designed with the best practices to simplify the on-boarding of ExaDB-C@C workloads and enable the continuous operations of their cloud resources. This reference architecture provides an automated landing zone configuration.

&nbsp;

## **2. Design Overview**
This workload extension uses the [One-OE](../../blueprints/one-oe/) Blueprint as the reference Landing Zone and guides the deployment of ExaDB-C@C on top of it. The extension includes a base infrastructure layer that provisions the required OCI resources for deploying ExaDB-C@C.

If you have not reviewed it yet, we recommend checking the [ExaDB-C@C use cases section](../exacc/exacc_use_cases/readme.md) to better understand the available scenarios and identify the one that best fits your needs.

&nbsp;

## **3. Deployment Options**

This Landing Zone Extension provides **two deployment approaches**, [single-stack](./single-stack/readme.md) and  [multi-stack](./multi-stack/readme.md), to accommodate different use cases and architectural preferences. Both approaches use the [OCI Landing Zone Orchestrator](https://github.com/oci-landing-zones/terraform-oci-modules-orchestrator).


### **Choosing the Right Approach**

<table style="width:100%; table-layout:fixed; word-break:break-word;">
  <colgroup>
    <col style="width:20%;">
    <col style="width:40%;">
    <col style="width:40%;">
  </colgroup>
  <thead>
    <tr>
      <th>Consideration</th>
      <th><a href="single-stack/">Single-stack</a></th>
      <th><a href="multi-stack/">Multi-stack</a></th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><strong>Use Case</strong></td>
      <td>PoC, Exploration</td>
      <td>Production deployment</td>
    </tr>
    <tr>
      <td><strong>Landing Zone</strong></td>
      <td>One-OE + ExaDB-C@C WE</td>
      <td>ExaDB-C@C WE to extend an existing One-OE</td>
    </tr>
    <tr>
      <td><strong>Deployment Steps</strong></td>
      <td>Single deployment operation</td>
      <td>Deploy LZ first, then ExaDB-C@C WE</td>
    </tr>
    <tr>
      <td><strong>Terraform State</strong></td>
      <td>Combined (1 state)</td>
      <td>Separate (2 states)</td>
    </tr>
    <tr>
      <td><strong>Deployment components</strong></td>
      <td>lz identity domain, One-OE + ExaDB-C@C groups, One-OE + ExaDB-C@C policies &amp; One-OE + ExaDB-C@C Observability resources</td>
      <td>ExaDB-C@C groups, policies &amp; obs. resources</td>
    </tr>
    <tr>
      <td><strong>Resource Lifecycle</strong></td>
      <td>Coupled</td>
      <td>Independent</td>
    </tr>
    <tr>
      <td><strong>Complexity</strong></td>
      <td>Self-contained</td>
      <td>Requires key coordination across stacks</td>
    </tr>
  </tbody>
  </table>

&nbsp;
# License <!-- omit from toc -->

Copyright (c) 2026 Oracle and/or its affiliates.

Licensed under the Universal Permissive License (UPL), Version 1.0.

See [LICENSE](/LICENSE.txt) for more details.
