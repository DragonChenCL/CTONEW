import { jsPDF } from 'jspdf'
import { toPng } from 'html-to-image'
import { marked } from 'marked'

/**
 * Format discussion history for display
 */
function formatDiscussionHistory(history) {
  if (!Array.isArray(history)) return []
  return history.map(item => {
    if (item.type === 'system') {
      return {
        type: 'system',
        content: item.content
      }
    } else if (item.type === 'doctor') {
      return {
        type: 'doctor',
        doctorName: item.doctorName || 'Unknown Doctor',
        content: item.content
      }
    } else if (item.type === 'patient') {
      return {
        type: 'patient',
        author: item.author || 'Patient',
        content: item.content
      }
    } else if (item.type === 'vote_detail') {
      return {
        type: 'vote_detail',
        voterName: item.voterName,
        targetName: item.targetName,
        reason: item.reason
      }
    } else if (item.type === 'vote_result') {
      return {
        type: 'vote_result',
        content: item.content
      }
    }
    return item
  })
}

/**
 * Generate HTML content for export - returns just the inner HTML without DOCTYPE
 */
function generateExportHTML(sessionMeta, sessionData) {
  const patientCase = sessionData.patientCase || {}
  const finalSummary = sessionData.finalSummary || {}
  const discussionHistory = formatDiscussionHistory(sessionData.discussionHistory || [])
  
  const timestamp = new Date().toLocaleString('zh-CN')
  
  // Format discussion history as HTML
  let discussionHTML = ''
  for (const item of discussionHistory) {
    if (item.type === 'system') {
      discussionHTML += `<div style="text-align: center; color: #8c8c8c; margin: 12px 0; font-size: 12px;">${escapeHTML(item.content)}</div>`
    } else if (item.type === 'doctor') {
      const content = marked.parse(item.content || '').trim()
      discussionHTML += `<div style="margin: 12px 0;">
        <div style="font-weight: 600; color: #1677ff; margin-bottom: 4px;">医生: ${escapeHTML(item.doctorName)}</div>
        <div style="background: #f0f5ff; padding: 10px; border-radius: 4px; border-left: 3px solid #1677ff; font-size: 13px;">
          <div style="margin: 0; padding: 0;">${content}</div>
        </div>
      </div>`
    } else if (item.type === 'patient') {
      const content = marked.parse(item.content || '').trim()
      discussionHTML += `<div style="margin: 12px 0;">
        <div style="font-weight: 600; color: #13c2c2; margin-bottom: 4px;">患者: ${escapeHTML(item.author || 'Patient')}</div>
        <div style="background: #e6f7ff; padding: 10px; border-radius: 4px; border-left: 3px solid #13c2c2; font-size: 13px;">
          <div style="margin: 0; padding: 0;">${content}</div>
        </div>
      </div>`
    } else if (item.type === 'vote_detail') {
      discussionHTML += `<div style="background: #fff7e6; padding: 6px 10px; margin: 8px 0; border-radius: 4px; border-left: 3px solid #fa8c16; font-size: 12px;">
        <span style="font-weight: 600;">${escapeHTML(item.voterName)}</span> 标注 <span style="font-weight: 600;">${escapeHTML(item.targetName)}</span> 为不太准确：${escapeHTML(item.reason || '')}
      </div>`
    } else if (item.type === 'vote_result') {
      discussionHTML += `<div style="text-align: center; color: #fa8c16; margin: 12px 0; font-size: 12px; font-weight: 600;">${escapeHTML(item.content)}</div>`
    }
  }
  
  // Format final summary
  const summaryContent = marked.parse(finalSummary.content || '').trim()
  
  // Return just the content, styles will be applied separately
  return `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Helvetica Neue', sans-serif; line-height: 1.6; color: #333; max-width: 900px; margin: 0 auto; padding: 40px; background: white;">
    <div style="text-align: center; margin-bottom: 30px; border-bottom: 2px solid #1677ff; padding-bottom: 20px;">
      <div style="font-size: 28px; font-weight: 700; color: #0958d9; margin-bottom: 10px;">🎯 AI 医疗会诊报告</div>
      <div style="color: #8c8c8c; font-size: 12px;">生成时间：${timestamp}</div>
    </div>

    <div style="margin-bottom: 30px;">
      <div style="font-size: 16px; font-weight: 700; color: #1677ff; margin-bottom: 12px; padding-bottom: 8px; border-bottom: 1px solid #e6f4ff;">👤 患者基本信息</div>
      <div style="background: #f5f5f5; padding: 12px; border-radius: 4px; margin-bottom: 12px;">
        <div style="display: flex; margin-bottom: 8px; font-size: 13px;">
          <div style="font-weight: 600; width: 100px; color: #595959; flex-shrink: 0;">患者姓名：</div>
          <div style="flex: 1; color: #262626;">${escapeHTML(patientCase.name || '—')}</div>
        </div>
        <div style="display: flex; margin-bottom: 8px; font-size: 13px;">
          <div style="font-weight: 600; width: 100px; color: #595959; flex-shrink: 0;">性别：</div>
          <div style="flex: 1; color: #262626;">${escapeHTML(patientCase.gender || '—')}</div>
        </div>
        <div style="display: flex; margin-bottom: 8px; font-size: 13px;">
          <div style="font-weight: 600; width: 100px; color: #595959; flex-shrink: 0;">年龄：</div>
          <div style="flex: 1; color: #262626;">${patientCase.age ?? '—'}</div>
        </div>
        ${patientCase.pastHistory ? `<div style="display: flex; margin-bottom: 8px; font-size: 13px;">
          <div style="font-weight: 600; width: 100px; color: #595959; flex-shrink: 0;">既往疾病：</div>
          <div style="flex: 1; color: #262626;">${escapeHTML(patientCase.pastHistory)}</div>
        </div>` : ''}
        ${patientCase.currentProblem ? `<div style="display: flex; margin-bottom: 8px; font-size: 13px;">
          <div style="font-weight: 600; width: 100px; color: #595959; flex-shrink: 0;">本次问题：</div>
          <div style="flex: 1; color: #262626;">${escapeHTML(patientCase.currentProblem)}</div>
        </div>` : ''}
        ${patientCase.imageRecognitionResult ? `<div style="display: flex; margin-bottom: 8px; font-size: 13px;">
          <div style="font-weight: 600; width: 100px; color: #595959; flex-shrink: 0;">图片识别：</div>
          <div style="flex: 1; color: #262626;">${escapeHTML(patientCase.imageRecognitionResult)}</div>
        </div>` : ''}
      </div>
      <div style="background: #fff1f0; border: 1px solid #ffccc7; color: #aa0605; padding: 12px; border-radius: 4px; font-size: 12px;">
        <strong>⚠️ 免责声明：</strong>本内容仅供参考，不能替代专业医疗意见。身体不适，请尽早就医。
      </div>
    </div>

    <div style="margin-bottom: 30px;">
      <div style="font-size: 16px; font-weight: 700; color: #1677ff; margin-bottom: 12px; padding-bottom: 8px; border-bottom: 1px solid #e6f4ff;">💬 AI 讨论过程</div>
      <div style="font-size: 13px; line-height: 1.8;">
        ${discussionHTML || '<div style="color: #8c8c8c;">暂无讨论内容</div>'}
      </div>
    </div>

    ${finalSummary.content ? `<div style="margin-bottom: 30px;">
      <div style="font-size: 16px; font-weight: 700; color: #1677ff; margin-bottom: 12px; padding-bottom: 8px; border-bottom: 1px solid #e6f4ff;">🎁 最终结果</div>
      <div style="background: #f0f5ff; border: 1px solid #adc6ff; padding: 16px; border-radius: 4px; margin-top: 12px; font-size: 13px;">
        <div style="margin: 0; padding: 0;">
          ${summaryContent}
        </div>
      </div>
    </div>` : ''}

    <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #f0f0f0; text-align: center; font-size: 11px; color: #8c8c8c;">
      <p style="margin: 0;">© AI 医疗会诊面板 | 本内容仅供参考，身体不适尽早就医</p>
    </div>
  </div>`
}

/**
 * Escape HTML special characters
 */
function escapeHTML(text) {
  if (!text) return ''
  const div = document.createElement('div')
  div.textContent = text
  return div.innerHTML
}

/**
 * Export session as HTML string
 */
export function exportSessionAsHTML(sessionMeta, sessionData) {
  return generateExportHTML(sessionMeta, sessionData)
}

/**
 * Export session as PDF
 */
export async function exportSessionAsPDF(sessionMeta, sessionData, fileName = 'consultation.pdf') {
  try {
    // Generate HTML content
    const html = generateExportHTML(sessionMeta, sessionData)
    
    // Create temporary container
    const container = document.createElement('div')
    container.style.position = 'fixed'
    container.style.left = '-9999px'
    container.style.top = '-9999px'
    container.style.width = '900px'
    container.style.background = 'white'
    container.style.visibility = 'hidden'
    container.style.zIndex = '-9999'
    document.body.appendChild(container)
    
    // Set HTML content directly (now returns simple div with inline styles)
    container.innerHTML = html
    
    // Wait for rendering
    await new Promise(resolve => setTimeout(resolve, 300))
    
    try {
      // Convert to image
      const dataUrl = await toPng(container, {
        pixelRatio: 2,
        cacheBust: true,
        width: 900
      })
      
      // Get image dimensions
      const img = new Image()
      img.src = dataUrl
      
      await new Promise((resolve, reject) => {
        img.onload = resolve
        img.onerror = reject
      })
      
      // Create PDF
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      })
      
      const pageWidth = pdf.internal.pageSize.getWidth()
      const pageHeight = pdf.internal.pageSize.getHeight()
      const margin = 10
      const maxWidth = pageWidth - margin * 2
      const maxHeight = pageHeight - margin * 2
      
      // Calculate image dimensions to fit page width
      const imgHeight = (img.height * maxWidth) / img.width
      
      // Add pages for full image height
      let yOffset = 0
      let isFirstPage = true
      
      while (yOffset < imgHeight) {
        if (!isFirstPage) {
          pdf.addPage()
        }
        
        pdf.addImage(dataUrl, 'PNG', margin, margin - yOffset, maxWidth, imgHeight)
        
        yOffset += maxHeight
        isFirstPage = false
      }
      
      pdf.save(fileName)
    } finally {
      // Remove temporary container
      if (document.body.contains(container)) {
        document.body.removeChild(container)
      }
    }
  } catch (error) {
    console.error('Error exporting PDF:', error)
    throw error
  }
}

/**
 * Export session as image
 */
export async function exportSessionAsImage(sessionMeta, sessionData, fileName = 'consultation.png') {
  try {
    // Generate HTML content
    const html = generateExportHTML(sessionMeta, sessionData)
    
    // Create temporary container
    const container = document.createElement('div')
    container.style.position = 'fixed'
    container.style.left = '-9999px'
    container.style.top = '-9999px'
    container.style.width = '900px'
    container.style.background = 'white'
    container.style.visibility = 'hidden'
    container.style.zIndex = '-9999'
    document.body.appendChild(container)
    
    // Set HTML content directly (now returns simple div with inline styles)
    container.innerHTML = html
    
    try {
      // Wait for rendering
      await new Promise(resolve => setTimeout(resolve, 300))
      
      // Convert to image
      const dataUrl = await toPng(container, {
        pixelRatio: 2,
        cacheBust: true,
        width: 900
      })
      
      // Download
      const link = document.createElement('a')
      link.href = dataUrl
      link.download = fileName
      link.style.display = 'none'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      
      // Revoke the URL after download
      setTimeout(() => URL.revokeObjectURL(dataUrl), 100)
    } finally {
      // Remove temporary container
      if (document.body.contains(container)) {
        document.body.removeChild(container)
      }
    }
  } catch (error) {
    console.error('Error exporting image:', error)
    throw error
  }
}
