local hub_a = import 'oci_open_lz_hub_a_network.auto.tfvars.jsonnet';
local routing_post = import 'routing_post.libsonnet';

hub_a + routing_post
