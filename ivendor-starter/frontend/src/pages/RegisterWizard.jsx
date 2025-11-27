import React, { useState } from 'react'
import api from '../lib/api'
import DocumentUploader from '../components/DocumentUploader'

export default function RegisterWizard(){
  const [step, setStep] = useState(1)
  const [tenantId, setTenantId] = useState('')
  const [vendorId, setVendorId] = useState('')
  const [companyName, setCompanyName] = useState('')
  const [contactEmail, setContactEmail] = useState('')

  const createTenant = async () => {
    const resp = await api.post('tenants', { name: `${companyName}-tenant` })
    const body = await resp.json()
    setTenantId(body.id)
    setStep(2)
  }

  const createVendor = async () => {
    const resp = await api.post(`tenants/${tenantId}/vendors`, { name: companyName, primary_contact: { email: contactEmail } })
    const body = await resp.json()
    setVendorId(body.id)
    setStep(3)
  }

  return (
    <div>
      <h2>Vendor Registration</h2>
      {step === 1 && (
        <div>
          <label>Company Name</label>
          <input value={companyName} onChange={(e)=>setCompanyName(e.target.value)} />
          <label>Contact Email</label>
          <input value={contactEmail} onChange={(e)=>setContactEmail(e.target.value)} />
          <div style={{marginTop:12}}>
            <button onClick={createTenant} disabled={!companyName}>Create Tenant</button>
          </div>
        </div>
      )}
      {step === 2 && (
        <div>
          <p>Tenant created: {tenantId}</p>
          <button onClick={createVendor}>Create Vendor Profile</button>
        </div>
      )}
      {step === 3 && (
        <div>
          <p>Vendor created: {vendorId}</p>
          <DocumentUploader tenantId={tenantId} vendorId={vendorId} />
        </div>
      )}
    </div>
  )
}
