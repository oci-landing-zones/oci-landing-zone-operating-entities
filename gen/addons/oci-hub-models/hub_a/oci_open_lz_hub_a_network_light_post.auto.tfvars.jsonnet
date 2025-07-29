local light = import 'oci_open_lz_hub_a_network_light.auto.tfvars.jsonnet';
local routing_post = import 'routing_post.libsonnet';

light + routing_post
