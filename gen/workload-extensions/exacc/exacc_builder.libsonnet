// gen/workload-extensions/exacc/exacc_builder.libsonnet
// Config-driven ExaDB-C@C workload extension.

local descriptions = import './descriptions.libsonnet';
local exadb_render = import '../exadb/render.libsonnet';
local products = import '../exadb/products.libsonnet';

{
  metadata(params):: {
    requires_network: false,
  },

  render(params)::
    {
      contributions: exadb_render.contributions({
        product: products.exacc,
        descriptions: descriptions,
        params: params,
      }),
    },
}
