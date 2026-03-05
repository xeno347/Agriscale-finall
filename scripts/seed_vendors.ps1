param(
  [Parameter(Mandatory = $false)]
  [string]$BaseUrl = "http://localhost:8000"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Post-Vendor {
  param(
    [Parameter(Mandatory = $true)][hashtable]$Payload,
    [Parameter(Mandatory = $true)][string]$Name
  )

  $url = "$BaseUrl/purchase_flow/add_new_vendor"
  $body = $Payload | ConvertTo-Json -Depth 12 -Compress

  Write-Host "\n=== POST: $Name ==="
  $out = curl.exe -s -S -X POST $url -H "Content-Type: application/json" --data-raw $body -w "`nHTTP:%{http_code}`n"
  Write-Output $out
}

$commonDocs = @{
  pan_card = ""
  aadhar_card = ""
  gst_registration_certificate = ""
  cancelled_cheque_or_passbook_front_page = ""
  udyam_akansha_msme_certificate = ""
}

# 1) Vishwakarma Engineering Pvt Ltd
Post-Vendor -Name "Vishwakarma Engineering Pvt Ltd" -Payload @{
  vendor_details = @{
    nature_of_vendor = "Machinery"
    vendor_name = "Vishwakarma Engineering Pvt Ltd"
    income_tax_pan = ""
    gst_number = "27ABCDE1234F1Z5"
    aadhar_card_number = ""
    vendor_contact = "08023456789"
    e_mail_id = "contact@vishwakarma.example"
    address = @{
      plot_flat_unit_no_and_floor = "Plot 12"
      name_of_premises = "Industrial Estate"
      road = ""
      taluka_locality = "Pune"
      district = "Pune"
      state = "Maharashtra"
      pin_code = "411001"
    }
    address_for_place_of_supply_of_goods_services = @{
      plot_flat_unit_no_and_floor = "Plot 12"
      name_of_premises = "Industrial Estate"
      road = ""
      taluka_locality = "Pune"
      district = "Pune"
      state = "Maharashtra"
      pin_code = "411001"
      contact_number = "08023456789"
      e_mail_id = "contact@vishwakarma.example"
      gst_number = "27ABCDE1234F1Z5"
    }
    vendor_address = "Plot 12, Industrial Estate, Pune, Maharashtra - 411001"
  }
  bank_details = @{
    name_of_bank = "State Bank of India"
    branch_address_with_pin_code = "Pune Main Branch, 411001"
    ifs_code = "SBIN0001234"
    account_type = "Current"
    account_number = "123456789012"
    sales_service_contract_authorised_person = @{
      name = ""
      mobile_number = ""
      e_mail_id = ""
    }
    commercial_authorised_person = @{
      name = ""
      mobile_number = ""
      e_mail_id = ""
    }
    masme_udyam_no = "UDYAM-MH-12-0012345"
  }
  document_url = $commonDocs
  tags = @("machinery", "services")
}

# 2) GreenSeeds Pvt Ltd
Post-Vendor -Name "GreenSeeds Pvt Ltd" -Payload @{
  vendor_details = @{
    nature_of_vendor = "Seeds"
    vendor_name = "GreenSeeds Pvt Ltd"
    income_tax_pan = ""
    gst_number = "27FGHIJ5678K2Z6"
    aadhar_card_number = ""
    vendor_contact = "9199887766"
    e_mail_id = "sales@greenseeds.example"
    address = @{
      plot_flat_unit_no_and_floor = "Block B"
      name_of_premises = "Agro Park"
      road = ""
      taluka_locality = "Nashik"
      district = "Nashik"
      state = "Maharashtra"
      pin_code = "422001"
    }
    address_for_place_of_supply_of_goods_services = @{
      plot_flat_unit_no_and_floor = "Block B"
      name_of_premises = "Agro Park"
      road = ""
      taluka_locality = "Nashik"
      district = "Nashik"
      state = "Maharashtra"
      pin_code = "422001"
      contact_number = "9199887766"
      e_mail_id = "sales@greenseeds.example"
      gst_number = "27FGHIJ5678K2Z6"
    }
    vendor_address = "Block B, Agro Park, Nashik, Maharashtra - 422001"
  }
  bank_details = @{
    name_of_bank = "HDFC Bank"
    branch_address_with_pin_code = "Nashik City Branch, 422001"
    ifs_code = "HDFC0000456"
    account_type = "Current"
    account_number = "045612340987"
    sales_service_contract_authorised_person = @{
      name = ""
      mobile_number = ""
      e_mail_id = ""
    }
    commercial_authorised_person = @{
      name = ""
      mobile_number = ""
      e_mail_id = ""
    }
    masme_udyam_no = "UDYAM-MH-15-0098765"
  }
  document_url = $commonDocs
  tags = @("seeds", "agriculture equipments")
}

# 3) AgriTech Solutions
Post-Vendor -Name "AgriTech Solutions" -Payload @{
  vendor_details = @{
    nature_of_vendor = "Services"
    vendor_name = "AgriTech Solutions"
    income_tax_pan = ""
    gst_number = "27KLMNO9012P3Z7"
    aadhar_card_number = ""
    vendor_contact = "2244445555"
    e_mail_id = "info@agritech.example"
    address = @{
      plot_flat_unit_no_and_floor = "3rd Floor"
      name_of_premises = "Tech Park"
      road = ""
      taluka_locality = "Mumbai"
      district = "Mumbai"
      state = "Maharashtra"
      pin_code = "400001"
    }
    address_for_place_of_supply_of_goods_services = @{
      plot_flat_unit_no_and_floor = "3rd Floor"
      name_of_premises = "Tech Park"
      road = ""
      taluka_locality = "Mumbai"
      district = "Mumbai"
      state = "Maharashtra"
      pin_code = "400001"
      contact_number = "2244445555"
      e_mail_id = "info@agritech.example"
      gst_number = "27KLMNO9012P3Z7"
    }
    vendor_address = "3rd Floor, Tech Park, Mumbai, Maharashtra - 400001"
  }
  bank_details = @{
    name_of_bank = "ICICI Bank"
    branch_address_with_pin_code = "Mumbai Fort Branch, 400001"
    ifs_code = "ICIC0000789"
    account_type = "Current"
    account_number = "078912340056"
    sales_service_contract_authorised_person = @{
      name = ""
      mobile_number = ""
      e_mail_id = ""
    }
    commercial_authorised_person = @{
      name = ""
      mobile_number = ""
      e_mail_id = ""
    }
    masme_udyam_no = "UDYAM-MH-22-0045678"
  }
  document_url = $commonDocs
  tags = @("IOT devices", "electronics", "computer")
}

# 4) Fertico Industries
Post-Vendor -Name "Fertico Industries" -Payload @{
  vendor_details = @{
    nature_of_vendor = "Fertilizer"
    vendor_name = "Fertico Industries"
    income_tax_pan = ""
    gst_number = "19PQRST3456U4Z8"
    aadhar_card_number = ""
    vendor_contact = "3366778899"
    e_mail_id = "support@fertico.example"
    address = @{
      plot_flat_unit_no_and_floor = ""
      name_of_premises = "Village Road"
      road = ""
      taluka_locality = "Kolkata"
      district = "Kolkata"
      state = "West Bengal"
      pin_code = "700001"
    }
    address_for_place_of_supply_of_goods_services = @{
      plot_flat_unit_no_and_floor = ""
      name_of_premises = "Village Road"
      road = ""
      taluka_locality = "Kolkata"
      district = "Kolkata"
      state = "West Bengal"
      pin_code = "700001"
      contact_number = "3366778899"
      e_mail_id = "support@fertico.example"
      gst_number = "19PQRST3456U4Z8"
    }
    vendor_address = "Village Road, Kolkata, West Bengal - 700001"
  }
  bank_details = @{
    name_of_bank = "Axis Bank"
    branch_address_with_pin_code = "Kolkata Central Branch, 700001"
    ifs_code = "UTIB0000123"
    account_type = "Current"
    account_number = "012300987654"
    sales_service_contract_authorised_person = @{
      name = ""
      mobile_number = ""
      e_mail_id = ""
    }
    commercial_authorised_person = @{
      name = ""
      mobile_number = ""
      e_mail_id = ""
    }
    masme_udyam_no = "UDYAM-WB-10-0076543"
  }
  document_url = $commonDocs
  tags = @("fertilizer", "chemicals")
}

# 5) Rapid Agro Logistics
Post-Vendor -Name "Rapid Agro Logistics" -Payload @{
  vendor_details = @{
    nature_of_vendor = "Transport"
    vendor_name = "Rapid Agro Logistics"
    income_tax_pan = ""
    gst_number = "33UVWXY6789Z5Z1"
    aadhar_card_number = ""
    vendor_contact = "4455667788"
    e_mail_id = "ops@rapidlogistics.example"
    address = @{
      plot_flat_unit_no_and_floor = "Warehouse 7"
      name_of_premises = "Outer Ring Road"
      road = ""
      taluka_locality = "Chennai"
      district = "Chennai"
      state = "Tamil Nadu"
      pin_code = "600001"
    }
    address_for_place_of_supply_of_goods_services = @{
      plot_flat_unit_no_and_floor = "Warehouse 7"
      name_of_premises = "Outer Ring Road"
      road = ""
      taluka_locality = "Chennai"
      district = "Chennai"
      state = "Tamil Nadu"
      pin_code = "600001"
      contact_number = "4455667788"
      e_mail_id = "ops@rapidlogistics.example"
      gst_number = "33UVWXY6789Z5Z1"
    }
    vendor_address = "Warehouse 7, Outer Ring Road, Chennai, Tamil Nadu - 600001"
  }
  bank_details = @{
    name_of_bank = "Canara Bank"
    branch_address_with_pin_code = "Chennai Main Branch, 600001"
    ifs_code = "CNRB0000567"
    account_type = "Current"
    account_number = "056712349999"
    sales_service_contract_authorised_person = @{
      name = ""
      mobile_number = ""
      e_mail_id = ""
    }
    commercial_authorised_person = @{
      name = ""
      mobile_number = ""
      e_mail_id = ""
    }
    masme_udyam_no = "UDYAM-TN-02-0032109"
  }
  document_url = $commonDocs
  tags = @("transport", "services")
}
