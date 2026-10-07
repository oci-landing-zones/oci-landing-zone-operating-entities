local builder = import './exaxs_builder.libsonnet';
local wrapper = import '../extension_wrapper.libsonnet';

wrapper.fromBuilder(builder)
