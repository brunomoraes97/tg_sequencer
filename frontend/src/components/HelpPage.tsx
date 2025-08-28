import React from 'react';

const HelpPage: React.FC = () => {
  return (
    <div className="page-container">
      <div className="page-header">
        <h1>❓ Help & Documentation</h1>
        <p>Learn how to use the Telegram Follow-up System</p>
      </div>

      <div className="help-content">
        <section className="help-section">
          <h2>🚀 Getting Started</h2>
          <div className="help-item">
            <h3>1. Create Your First Account</h3>
            <p>
              Go to the <strong>Accounts</strong> page and click "New Account". Enter your phone number 
              and verify it with the SMS code you receive. This account will be used to send follow-up messages.
            </p>
          </div>
          
          <div className="help-item">
            <h3>2. Set Up a Campaign</h3>
            <p>
              Navigate to <strong>Campaigns</strong> and create a new campaign. Choose your verified account, 
              set a name, and configure the interval between messages. You can set intervals in seconds, 
              minutes, hours, or days.
            </p>
          </div>
          
          <div className="help-item">
            <h3>3. Add Campaign Steps</h3>
            <p>
              After creating a campaign, add message steps. Each step represents a message that will be 
              sent in sequence. The system automatically determines the maximum steps based on how many 
              steps you add.
            </p>
          </div>
          
          <div className="help-item">
            <h3>4. Add Contacts</h3>
            <p>
              Go to <strong>Contacts</strong> and add people you want to follow up with. You can add them 
              by username (@username) or phone number. Give them friendly names and tags for better organization.
            </p>
          </div>
        </section>

        <section className="help-section">
          <h2>📊 Dashboard</h2>
          <p>
            The dashboard provides an overview of your entire system with real-time data and reports:
          </p>
          <ul>
            <li><strong>Account Statistics:</strong> See how many accounts you have and their status</li>
            <li><strong>Campaign Performance:</strong> View active campaigns and their effectiveness</li>
            <li><strong>Contact Insights:</strong> Monitor contact responses and engagement</li>
            <li><strong>Next Messages:</strong> See when the next messages will be sent</li>
          </ul>
        </section>

        <section className="help-section">
          <h2>📞 Managing Accounts</h2>
          <div className="help-item">
            <h3>Account Status</h3>
            <ul>
              <li><strong>✅ Active:</strong> Account is verified and ready to send messages</li>
              <li><strong>⏳ Pending Verification:</strong> Waiting for SMS code verification</li>
              <li><strong>❌ Error:</strong> Account has an issue and needs attention</li>
            </ul>
          </div>
          
          <div className="help-item">
            <h3>Account Names & Tags</h3>
            <p>
              Add friendly names and tags to your accounts for better organization. This is especially 
              useful when managing multiple accounts for different purposes or teams.
            </p>
          </div>
        </section>

        <section className="help-section">
          <h2>🎯 Campaign Management</h2>
          <div className="help-item">
            <h3>Message Intervals</h3>
            <p>
              Set how long to wait between sending each message step. You can configure this in:
            </p>
            <ul>
              <li><strong>Seconds:</strong> For testing (minimum 1 second)</li>
              <li><strong>Minutes:</strong> For quick follow-ups (e.g., 30 minutes)</li>
              <li><strong>Hours:</strong> For same-day follow-ups (e.g., 4 hours)</li>
              <li><strong>Days:</strong> For spaced follow-ups (e.g., 3 days)</li>
            </ul>
          </div>
          
          <div className="help-item">
            <h3>Campaign Steps</h3>
            <p>
              Each campaign can have multiple message steps. Messages are sent in order, and the system 
              automatically stops if a contact replies. The maximum steps is determined by how many 
              steps you create.
            </p>
          </div>
        </section>

        <section className="help-section">
          <h2>👥 Contact Management</h2>
          <div className="help-item">
            <h3>Adding Contacts</h3>
            <p>You can add contacts using:</p>
            <ul>
              <li><strong>Username:</strong> @username (most reliable)</li>
              <li><strong>Phone Number:</strong> +1234567890 (must be registered on Telegram)</li>
            </ul>
          </div>
          
          <div className="help-item">
            <h3>Contact Status</h3>
            <ul>
              <li><strong>✅ Replied:</strong> Contact has responded, sequence stopped</li>
              <li><strong>📤 In Progress:</strong> Messages are being sent according to schedule</li>
              <li><strong>⏹️ Completed:</strong> All message steps have been sent</li>
            </ul>
          </div>
          
          <div className="help-item">
            <h3>Next Message Timing</h3>
            <p>
              The system shows when the next message will be sent:
            </p>
            <ul>
              <li><strong>🔴 Due now:</strong> Message should be sent immediately</li>
              <li><strong>🟡 Due soon:</strong> Message scheduled within the hour</li>
              <li><strong>🟢 Scheduled:</strong> Message scheduled for later</li>
            </ul>
          </div>
        </section>

        <section className="help-section">
          <h2>⚙️ System Features</h2>
          <div className="help-item">
            <h3>Automatic Message Sending</h3>
            <p>
              The system runs a background worker that automatically sends messages according to your 
              campaign schedules. Messages are sent only when:
            </p>
            <ul>
              <li>The contact hasn't replied yet</li>
              <li>The interval time has passed since the last message</li>
              <li>There are more steps remaining in the campaign</li>
            </ul>
          </div>
          
          <div className="help-item">
            <h3>User Information Enrichment</h3>
            <p>
              When possible, the system automatically fetches additional information about your contacts 
              from Telegram, including names, verification status, and profile details.
            </p>
          </div>
        </section>

        <section className="help-section">
          <h2>🔧 Tips & Best Practices</h2>
          <ul>
            <li><strong>Start with longer intervals:</strong> Begin with 24-hour intervals to avoid seeming spammy</li>
            <li><strong>Keep messages personal:</strong> Write natural, helpful messages rather than salesy content</li>
            <li><strong>Monitor responses:</strong> Check the dashboard regularly to see how contacts are responding</li>
            <li><strong>Use tags effectively:</strong> Organize contacts and accounts with meaningful tags</li>
            <li><strong>Test first:</strong> Try your campaign with a small group before scaling up</li>
            <li><strong>Respect privacy:</strong> Only message people who have shown interest in your services</li>
          </ul>
        </section>

        <section className="help-section">
          <h2>🚨 Troubleshooting</h2>
          <div className="help-item">
            <h3>Account Issues</h3>
            <ul>
              <li><strong>Can't verify:</strong> Make sure you're entering the correct phone number and SMS code</li>
              <li><strong>Account shows error:</strong> The Telegram session may have expired, try creating a new account</li>
            </ul>
          </div>
          
          <div className="help-item">
            <h3>Contact Issues</h3>
            <ul>
              <li><strong>Can't find user:</strong> Make sure the username or phone number is correct and the user exists on Telegram</li>
              <li><strong>Messages not sending:</strong> Check that your account is active and the campaign is enabled</li>
            </ul>
          </div>
        </section>

        <div className="help-footer">
          <p>
            <strong>Need more help?</strong> This system is designed to be intuitive and powerful. 
            If you're still having issues, check that all your accounts are verified and campaigns 
            are properly configured.
          </p>
        </div>
      </div>
    </div>
  );
};

export default HelpPage;
