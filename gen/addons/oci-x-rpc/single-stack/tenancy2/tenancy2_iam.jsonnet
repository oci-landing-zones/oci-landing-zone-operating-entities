local one_oe_iam = import '../../../../../blueprints/one-oe/runtime/one-stack/oneoe_iam.json';
local xrpc_iam = import '../../xrpc_iam_common.libsonnet';

one_oe_iam + xrpc_iam.single_stack.tenancy2
