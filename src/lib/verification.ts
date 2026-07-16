// User Verification System for Dates.care
export interface VerificationDocument {
  id: string;
  userId: string;
  type: 'government_id' | 'selfie' | 'address_proof' | 'phone_verification' | 'legal_name' | 'other';
  fileName: string;
  fileUrl: string;
  uploadDate: Date;
  status: 'pending' | 'approved' | 'rejected' | 'requires_resubmission';
  reviewedBy?: string;
  reviewDate?: Date;
  rejectionReason?: string;
  notes?: string;
}

export interface VerificationRequest {
  id: string;
  userId: string;
  userEmail: string;
  userName: string;
  submissionDate: Date;
  status: 'incomplete' | 'submitted' | 'under_review' | 'approved' | 'rejected';
  documents: VerificationDocument[];
  phoneNumber?: string;
  address?: {
    street: string;
    city: string;
    province: string;
    postalCode: string;
    country: string;
  };
  legalName?: {
    firstName: string;
    lastName: string;
    middleName?: string;
  };
  reviewedBy?: string;
  reviewDate?: Date;
  approvalDate?: Date;
  rejectionReason?: string;
  staffNotes?: string;
}

export interface VerificationRequirements {
  governmentId: {
    required: true;
    description: 'Valid government-issued photo ID (Driver\'s License, Passport, etc.)';
    formats: string[];
  };
  selfiePhoto: {
    required: true;
    description: 'Clear selfie photo holding your government ID';
    formats: string[];
  };
  phoneNumber: {
    required: true;
    description: 'Valid phone number for SMS verification';
  };
  address: {
    required: true;
    description: 'Current residential address with proof document';
    formats: string[];
  };
  legalName: {
    required: true;
    description: 'Full legal name as it appears on government ID';
  };
}

class UserVerificationManager {
  private verificationRequests: Map<string, VerificationRequest> = new Map();
  private staffMembers: Set<string> = new Set([
    'admin@dates.care',
    'support@dates.care',
    'verification@dates.care',
    'moderator@dates.care'
  ]);

  // Verification requirements
  private requirements: VerificationRequirements = {
    governmentId: {
      required: true,
      description: 'Valid government-issued photo ID (Driver\'s License, Passport, etc.)',
      formats: ['jpg', 'jpeg', 'png', 'pdf']
    },
    selfiePhoto: {
      required: true,
      description: 'Clear selfie photo holding your government ID',
      formats: ['jpg', 'jpeg', 'png']
    },
    phoneNumber: {
      required: true,
      description: 'Valid phone number for SMS verification'
    },
    address: {
      required: true,
      description: 'Current residential address with proof document',
      formats: ['jpg', 'jpeg', 'png', 'pdf']
    },
    legalName: {
      required: true,
      description: 'Full legal name as it appears on government ID'
    }
  };

  // Initialize verification request
  initializeVerification(userId: string, userEmail: string, userName: string): string {
    const requestId = Math.random().toString(36).substring(2);
    
    const request: VerificationRequest = {
      id: requestId,
      userId,
      userEmail,
      userName,
      submissionDate: new Date(),
      status: 'incomplete',
      documents: []
    };

    this.verificationRequests.set(requestId, request);
    return requestId;
  }

  // Add document to verification request
  addDocument(
    requestId: string,
    type: VerificationDocument['type'],
    fileName: string,
    fileUrl: string
  ): boolean {
    const request = this.verificationRequests.get(requestId);
    if (!request) return false;

    const document: VerificationDocument = {
      id: Math.random().toString(36).substring(2),
      userId: request.userId,
      type,
      fileName,
      fileUrl,
      uploadDate: new Date(),
      status: 'pending'
    };

    request.documents.push(document);
    return true;
  }

  // Update personal information
  updatePersonalInfo(
    requestId: string,
    info: {
      phoneNumber?: string;
      address?: VerificationRequest['address'];
      legalName?: VerificationRequest['legalName'];
    }
  ): boolean {
    const request = this.verificationRequests.get(requestId);
    if (!request) return false;

    if (info.phoneNumber) request.phoneNumber = info.phoneNumber;
    if (info.address) request.address = info.address;
    if (info.legalName) request.legalName = info.legalName;

    return true;
  }

  // Submit verification request
  submitVerification(requestId: string): boolean {
    const request = this.verificationRequests.get(requestId);
    if (!request) return false;

    // Check if all requirements are met
    const hasGovernmentId = request.documents.some(d => d.type === 'government_id');
    const hasSelfie = request.documents.some(d => d.type === 'selfie');
    const hasAddressProof = request.documents.some(d => d.type === 'address_proof');
    const hasPhoneNumber = !!request.phoneNumber;
    const hasLegalName = !!request.legalName;

    if (!hasGovernmentId || !hasSelfie || !hasAddressProof || !hasPhoneNumber || !hasLegalName) {
      return false;
    }

    request.status = 'submitted';
    
    // Notify staff about new verification request
    this.notifyStaffNewVerification(request);
    
    return true;
  }

  // Staff: Get pending verification requests
  getPendingVerifications(staffEmail: string): VerificationRequest[] {
    if (!this.staffMembers.has(staffEmail)) {
      throw new Error('Access denied: Not authorized staff member');
    }

    return Array.from(this.verificationRequests.values())
      .filter(req => req.status === 'submitted' || req.status === 'under_review');
  }

  // Staff: Review verification request
  reviewVerification(
    requestId: string,
    staffEmail: string,
    decision: 'approve' | 'reject',
    notes?: string,
    rejectionReason?: string
  ): boolean {
    if (!this.staffMembers.has(staffEmail)) {
      throw new Error('Access denied: Not authorized staff member');
    }

    const request = this.verificationRequests.get(requestId);
    if (!request) return false;

    request.reviewedBy = staffEmail;
    request.reviewDate = new Date();
    request.staffNotes = notes;

    if (decision === 'approve') {
      request.status = 'approved';
      request.approvalDate = new Date();
      
      // Update all documents to approved
      request.documents.forEach(doc => {
        doc.status = 'approved';
        doc.reviewedBy = staffEmail;
        doc.reviewDate = new Date();
      });

      // Send approval notification
      this.sendVerificationApprovalEmail(request);
    } else {
      request.status = 'rejected';
      request.rejectionReason = rejectionReason;
      
      // Send rejection notification
      this.sendVerificationRejectionEmail(request, rejectionReason || 'Documents did not meet verification requirements');
    }

    return true;
  }

  // Get verification status for user
  getVerificationStatus(userId: string): {
    isVerified: boolean;
    status: string;
    submissionDate?: Date;
    approvalDate?: Date;
    rejectionReason?: string;
    missingDocuments: string[];
  } {
    const request = Array.from(this.verificationRequests.values())
      .find(req => req.userId === userId);

    if (!request) {
      return {
        isVerified: false,
        status: 'not_started',
        missingDocuments: ['government_id', 'selfie', 'address_proof', 'phone_number', 'legal_name']
      };
    }

    const missingDocuments: string[] = [];
    
    if (!request.documents.some(d => d.type === 'government_id')) {
      missingDocuments.push('government_id');
    }
    if (!request.documents.some(d => d.type === 'selfie')) {
      missingDocuments.push('selfie');
    }
    if (!request.documents.some(d => d.type === 'address_proof')) {
      missingDocuments.push('address_proof');
    }
    if (!request.phoneNumber) {
      missingDocuments.push('phone_number');
    }
    if (!request.legalName) {
      missingDocuments.push('legal_name');
    }

    return {
      isVerified: request.status === 'approved',
      status: request.status,
      submissionDate: request.submissionDate,
      approvalDate: request.approvalDate,
      rejectionReason: request.rejectionReason,
      missingDocuments
    };
  }

  // Get verification requirements
  getRequirements(): VerificationRequirements {
    return this.requirements;
  }

  // Private methods for notifications
  private notifyStaffNewVerification(request: VerificationRequest): void {
    console.log(`📋 New verification request from ${request.userName} (${request.userEmail})`);
    
    // In a real app, this would send emails to staff
    this.staffMembers.forEach(staffEmail => {
      console.log(`📧 Notification sent to ${staffEmail}: New verification request #${request.id}`);
    });
  }

  private sendVerificationApprovalEmail(request: VerificationRequest): void {
    console.log(`✅ Verification approved for ${request.userEmail}`);
    
    // Email content for approval
    const emailContent = {
      to: request.userEmail,
      subject: 'Dates.care - Verification Approved! ✅',
      html: `
        <h2>Congratulations! Your account has been verified.</h2>
        <p>Dear ${request.userName},</p>
        <p>Your identity verification has been approved. You now have a verified badge on your profile!</p>
        <p>Verified benefits include:</p>
        <ul>
          <li>✅ Verified badge on your profile</li>
          <li>🔒 Enhanced security and trust</li>
          <li>⭐ Priority in search results</li>
          <li>💎 Access to verified-only features</li>
        </ul>
        <p>Thank you for helping us maintain a safe and trusted community.</p>
        <p>Best regards,<br>The Dates.care Team</p>
      `
    };
    
    console.log('📧 Approval email sent:', emailContent);
  }

  private sendVerificationRejectionEmail(request: VerificationRequest, reason: string): void {
    console.log(`❌ Verification rejected for ${request.userEmail}: ${reason}`);
    
    // Email content for rejection
    const emailContent = {
      to: request.userEmail,
      subject: 'Dates.care - Verification Update Required',
      html: `
        <h2>Verification Update Required</h2>
        <p>Dear ${request.userName},</p>
        <p>We've reviewed your verification documents and need some updates before we can approve your account.</p>
        <p><strong>Reason:</strong> ${reason}</p>
        <p>Please log into your account and resubmit the required documents. Our team is here to help if you have any questions.</p>
        <p>Contact us at verification@dates.care or call +1-289-270-9919 for assistance.</p>
        <p>Best regards,<br>The Dates.care Team</p>
      `
    };
    
    console.log('📧 Rejection email sent:', emailContent);
  }

  // Phone verification
  sendPhoneVerification(phoneNumber: string): string {
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    
    console.log(`📱 SMS verification code sent to ${phoneNumber}: ${code} (via +1-289-270-9919)`);
    
    // In a real app, this would use Twilio or similar service
    return code;
  }

  // Verify phone code
  verifyPhoneCode(_phoneNumber: string, code: string, expectedCode: string): boolean {
    return code === expectedCode;
  }

  // Get verification statistics for staff
  getVerificationStats(staffEmail: string): {
    pending: number;
    approved: number;
    rejected: number;
    total: number;
  } {
    if (!this.staffMembers.has(staffEmail)) {
      throw new Error('Access denied: Not authorized staff member');
    }

    const requests = Array.from(this.verificationRequests.values());
    
    return {
      pending: requests.filter(r => r.status === 'submitted' || r.status === 'under_review').length,
      approved: requests.filter(r => r.status === 'approved').length,
      rejected: requests.filter(r => r.status === 'rejected').length,
      total: requests.length
    };
  }
}

export const verificationManager = new UserVerificationManager();

// Utility functions
export const startVerification = (userId: string, userEmail: string, userName: string): string => {
  return verificationManager.initializeVerification(userId, userEmail, userName);
};

export const uploadVerificationDocument = (
  requestId: string,
  type: VerificationDocument['type'],
  fileName: string,
  fileUrl: string
): boolean => {
  return verificationManager.addDocument(requestId, type, fileName, fileUrl);
};

export const submitVerificationRequest = (requestId: string): boolean => {
  return verificationManager.submitVerification(requestId);
};

export const getVerificationStatus = (userId: string) => {
  return verificationManager.getVerificationStatus(userId);
};

export const getVerificationRequirements = () => {
  return verificationManager.getRequirements();
};