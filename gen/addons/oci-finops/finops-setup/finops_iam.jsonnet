local one_oe_iam = import '../../../../blueprints/one-oe/runtime/one-stack/oneoe_iam.json';
local finops_iam = import '../finops_iam.libsonnet';

one_oe_iam + finops_iam
