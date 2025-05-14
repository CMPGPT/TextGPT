import { redirect } from 'next/navigation';

export default function IQRChatPage() {
  // Redirect to a default business ID for the chat
  // Using the test business ID from the products API
  redirect('/iqr/chat/11111111-1111-1111-1111-111111111111');
  
  // This won't render, but here to maintain component structure
  return (
    <div>
      {/* IQR chat page */}
    </div>
  );
} 