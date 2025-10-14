local hub_a_light = import 'oci_open_lz_hub_a_network_light.auto.tfvars.jsonnet';
local routing_post = import 'routing_post.libsonnet';

hub_a_light + routing_post
