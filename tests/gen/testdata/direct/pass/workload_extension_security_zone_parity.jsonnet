// Workload-extension security zones retain the generic composition by CIS level.
local security_zones(doc) = doc.security_zones_configuration;

local profiles = import 'gen/blueprints/one-oe/runtime/one-stack/profiles.libsonnet';
local baseline = (import 'gen/landing_zone.libsonnet')(profiles.hub_a.config);
local oneoe = {
  cis1_pre: baseline.security_cis1_pre,
  cis1: baseline.security_cis1,
  cis2_pre: baseline.security_cis2_pre,
  cis2: baseline.security_cis2,
};

{
  exacc_single_stack_cis1_pre:
    security_zones(import 'gen/workload-extensions/exacc/single-stack/exacc_security_cis1_uc1_pre.jsonnet') ==
    security_zones(oneoe.cis1_pre),
  exacc_single_stack_cis1:
    security_zones(import 'gen/workload-extensions/exacc/single-stack/exacc_security_cis1_uc1.jsonnet') ==
    security_zones(oneoe.cis1),
  exacc_single_stack_cis2_pre:
    security_zones(import 'gen/workload-extensions/exacc/single-stack/exacc_security_cis2_uc1_pre.jsonnet') ==
    security_zones(oneoe.cis2_pre),
  exacc_single_stack_cis2:
    security_zones(import 'gen/workload-extensions/exacc/single-stack/exacc_security_cis2_uc1.jsonnet') ==
    security_zones(oneoe.cis2),
  exacs_single_stack_cis1_pre:
    security_zones(import 'gen/workload-extensions/exacs/single-stack/exacs_security_cis1_uc1_pre.jsonnet') ==
    security_zones(oneoe.cis1_pre),
  exacs_single_stack_cis1:
    security_zones(import 'gen/workload-extensions/exacs/single-stack/exacs_security_cis1_uc1.jsonnet') ==
    security_zones(oneoe.cis1),
  exacs_single_stack_cis2_pre:
    security_zones(import 'gen/workload-extensions/exacs/single-stack/exacs_security_cis2_uc1_pre.jsonnet') ==
    security_zones(oneoe.cis2_pre),
  exacs_single_stack_cis2:
    security_zones(import 'gen/workload-extensions/exacs/single-stack/exacs_security_cis2_uc1.jsonnet') ==
    security_zones(oneoe.cis2),
  oke_single_stack_cis1:
    security_zones(import 'gen/workload-extensions/oke/simple/single-stack/oke_security_cis1.jsonnet') ==
    security_zones(oneoe.cis1),
  oke_single_stack_cis1_pre:
    security_zones(import 'gen/workload-extensions/oke/simple/single-stack/oke_security_cis1_pre.jsonnet') ==
    security_zones(oneoe.cis1_pre),
  oke_single_stack_cis2:
    security_zones(import 'gen/workload-extensions/oke/simple/single-stack/oke_security_cis2.jsonnet') ==
    security_zones(oneoe.cis2),
  oke_single_stack_cis2_pre:
    security_zones(import 'gen/workload-extensions/oke/simple/single-stack/oke_security_cis2_pre.jsonnet') ==
    security_zones(oneoe.cis2_pre),
}
