local hub_b = import 'oci_open_lz_hub_b_network.auto.tfvars.jsonnet';
local routing_post = import 'routing_post.libsonnet';

hub_b + routing_post

