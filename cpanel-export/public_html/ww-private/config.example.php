<?php
/**
 * Wordy World configuration.
 *
 * Copy this file to config.php in the same folder (or to /home/YOURUSER/wordy-config.php,
 * one level above public_html, which is safer) and fill in the values.
 * Never commit the real file to a repository and never move it into public_html root.
 */

return [
    'db' => [
        // cPanel prefixes database and user names with your account name, e.g.
        // "myaccount_wordy". Use the full prefixed names here.
        'host' => 'localhost',
        'name' => 'cpaneluser_wordy',
        'user' => 'cpaneluser_wordy',
        'pass' => 'the-database-password-from-cPanel',
        // Optional: set a DSN to override the MySQL connection string built from
        // the values above. Only useful for local testing, e.g.
        // 'dsn' => 'sqlite:/home/user/wordy.sqlite',
        'dsn' => null,
    ],

    // Server-side only. Create one at https://platform.openai.com/api-keys.
    // Leaving it empty is fine: the site still works, the story coach just switches
    // itself off and the page shows its friendly offline tips instead.
    'openai_key' => '',

    // Which OpenAI model to try first. The second is used if the first is gone.
    'models' => ['gpt-4o-mini', 'gpt-4.1-mini'],
];
