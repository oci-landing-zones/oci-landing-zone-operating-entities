local one_oe_governance = import '../../../../blueprints/one-oe/runtime/one-stack/oneoe_governance.json';
local finops_governance = import '../finops_governance.libsonnet';

one_oe_governance + finops_governance
