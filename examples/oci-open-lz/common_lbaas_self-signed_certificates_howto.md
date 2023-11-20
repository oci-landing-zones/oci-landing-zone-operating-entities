## LBaaS self-signed certificates creation example

For the examples given for shared OE, it is required that you have valid Load Balancer certificates for SSL connections to your Load Balancer. You can find more information about the OCI Load Balancer certificates requirements in the [OCI public documentation](https://docs.oracle.com/en-us/iaas/Content/Balance/Tasks/managingcertificates.htm). 

The Load Balancer service doesn't generate SSL certificates. You can import existing certificates created by external parties or you could use self-signed certificates. 

For educational purposes, we leave here how to create self-signed certificates, which are not adequate for production purposes but will allow you to deploy the Open LZ shared or OE environments and get familiar with it.

In the shared or OE examples you will find in the ```open_lz_*_network.auto.tfvars.json`````` a section for Load Balancers with the following information:

```
"certificates": {
    "LB-SHARED-CERT-1-KEY": {
        "ca_certificate": "~/certs/ca.crt",
        "certificate_name": "lb1-cert1",
        "private_key": "~/certs/my_cert.key",
        "public_certificate": "~/certs/my_cert.crt"
    }
}
```

You can see a reference to your root CA certificate (```ca.crt```), a given name for the certificate that you're importing as you will see the certificates section of the Load Balancer managed certificates in OCI (```lb1-cert1``` in the example), the Load Balancer certificate private key (```my_cert.key```), and the public certificate (```my_cert.crt```). You can customize as you want for your existing certificates with its name or location inside the machine where you're running your Terraform coe.

For the creation of your own self-signed certificates and using the name and location given in the example, you would need:

  1. Make sure that you have the OpenSSL tool in the machine where you're going to create the self-signed certificates [OpenSSL Downloads](https://www.openssl.org/source/).
    
  2. Create a directory in your home directory called ```certs```:
      ```
      mkdir ~/certs
      ```

  3. Create a Self-Signed Root CA:
      ```
      openssl req -x509 -sha256 -days 1825 -newkey rsa:2048 -keyout ca.key -out ca.crt
      ```

  4. Create a cert key and certificate signing request (CSR):
      ```
      openssl req -newkey rsa:2048 -nodes -keyout my_cert.key -out my_cert.csr
      ```

  5. Sign the certificate CSR with Root CA:
      ```
      cat my_cert.txt
      authorityKeyIdentifier=keyid,issuer
      basicConstraints=CA:FALSE
      subjectAltName = @alt_names
      [alt_names]
      DNS.1 = oe01.com
      
      openssl x509 -req -CA ca.crt -CAkey ca.key -in my_cert.csr -out my_cert.crt -days 365 -CAcreateserial -extfile my_cert.txt
      ```

  6. Check the cert:
      ```
      openssl x509 -text -noout -in my_cert.crt
      ```

After the creation of the self-signed certificates, you will be able to run the examples given for shared OE environments.

&nbsp; 
