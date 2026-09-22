// workload extension published security-zone configs match One-OE by CIS level
local security_zones(doc) = doc.security_zones_configuration;

local oneoe = {
  cis1_pre: import 'gen/blueprints/one-oe/runtime/one-stack/oneoe_security_cis1_pre.jsonnet',
  cis1: import 'gen/blueprints/one-oe/runtime/one-stack/oneoe_security_cis1.jsonnet',
  cis2_pre: import 'gen/blueprints/one-oe/runtime/one-stack/oneoe_security_cis2_pre.jsonnet',
  cis2: import 'gen/blueprints/one-oe/runtime/one-stack/oneoe_security_cis2.jsonnet',
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
