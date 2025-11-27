import React, { useState } from 'react'
import api from '../lib/api'

export default function DocumentUploader({ tenantId, vendorId }){
  const [file, setFile] = useState(null)
  const [type, setType] = useState('business_license')
  const [status, setStatus] = useState('')

  const handleUpload = async () => {
    if (!file) return alert('Select a file')
    setStatus('Requesting upload URL...')
    const resp = await api.post(`tenants/${tenantId}/vendors/${vendorId}/documents`, { filename: file.name, type })
    if (!resp.ok) { setStatus('Failed to get upload URL'); return }
    const body = await resp.json()
    setStatus('Uploading to presigned URL...')
    // PUT to presigned URL directly
    const uploadResp = await fetch(body.uploadUrl, { method: 'PUT', body: file })
    if (!uploadResp.ok) { setStatus('Upload failed'); return }
    // No need to call backend /complete when using MinIO webhook — verification will be triggered automatically
    setStatus('Upload complete. Verification will start automatically via MinIO event notification')
  }

  return (
    <div>
      <h3>Upload Document</h3>
      <label>Type</label>
      <select value={type} onChange={(e)=>setType(e.target.value)}>
        <option value="business_license">Business License</option>
        <option value="tax_certificate">Tax Certificate</option>
        <option value="id_card">ID Card</option>
      </select>
      <input type="file" onChange={(e)=>setFile(e.target.files[0])} />
      <div style={{marginTop:8}}>
        <button onClick={handleUpload}>Upload</button>
      </div>
      <div style={{marginTop:8}}>{status}</div>
    </div>
  )
}
