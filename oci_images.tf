#File used only if Stack is a Marketplace Stack
#Update based on Marketplace Listing - App Install Package - Image Oracle Cloud Identifier
#Each element is a single image from Marketpalce Catalog. Elements' name in map is arbitrary 


variable "marketplace_source_images" {
  type = map(object({
    ocid = string
    is_pricing_associated = bool
    compatible_shapes = list(string)
  }))
  default = {
    main_mktpl_image = {
      ocid = "ocid1.image.oc1..<unique_id>"
      is_pricing_associated = true
      compatible_shapes = []
    }
    #Remove comment and add as many marketplace images that your stack references be replicated to other realms 
    #supporting_image = {
    #  ocid = "ocid1.image.oc1..<unique_id>"
    #  is_pricing_associated = false
    #  compatible_shapes = ["VM.Standard2.2", "VM.Standard.E2.1.Micro"]
    #}
  }
}
