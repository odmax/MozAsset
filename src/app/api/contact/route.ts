import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { sendTemplateEmail } from '@/lib/email';
import { createAdminNotification } from '@/lib/admin-notifications';
import { normalizeEmail } from '@/lib/email-normalize';

export async function POST(request: Request) {
  try {
    const { name, email: rawEmail, company, phone, message } = await request.json();
    const email = normalizeEmail(rawEmail || '');

    if (!name || !email || !company || !message) {
      return NextResponse.json(
        { error: 'All fields except phone are required' },
        { status: 400 }
      );
    }

    const submission = await prisma.contactSubmission.create({
      data: {
        name,
        email,
        company,
        phone,
        message,
        status: 'PENDING',
      },
    });

    // Notify platform admins
    const admins = await prisma.internalAdmin.findMany({
      where: {
        role: { in: ['SUPER_ADMIN', 'OWNER'] },
        isActive: true,
      },
    });

    const details = `From: ${name} (${email}, ${company})${phone ? `, Phone: ${phone}` : ''}\n\nMessage:\n${message}`;

    for (const admin of admins) {
      await createAdminNotification({
        adminId: admin.id,
        type: 'SUPPORT_REPLY',
        title: 'New contact form enquiry',
        message: `${name} from ${company} submitted a contact form enquiry`,
        link: `/admin/contact-submissions/${submission.id}`,
        metadata: { submissionId: submission.id, name, email, company },
      });
    }

    // Send email to info@mozetech.co.za
    await sendTemplateEmail(
      'info@mozetech.co.za',
      `New Contact Form Enquiry from ${name} at ${company}`,
      `<p><strong>Name:</strong> ${name}</p>
<p><strong>Email:</strong> ${email}</p>
<p><strong>Company:</strong> ${company}</p>
${phone ? `<p><strong>Phone:</strong> ${phone}</p>` : ''}
<p><strong>Message:</strong></p>
<p>${message}</p>`,
      details,
      'contact_form',
      { submissionId: submission.id }
    );

    return NextResponse.json({ success: true, id: submission.id });
  } catch (error) {
    console.error('Contact submission error:', error);
    return NextResponse.json(
      { error: 'Failed to submit contact form' },
      { status: 500 }
    );
  }
}