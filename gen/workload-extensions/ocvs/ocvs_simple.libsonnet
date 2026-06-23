local builder = import './ocvs_builder.libsonnet';
local wrapper = import '../extension_wrapper.libsonnet';

wrapper.fromBuilder(builder)
