# Guild Portal setup

`index.php` is the public sign-in page. The portal keeps PHP endpoints in `api/`, styles in `css/`, local records in `data/`, images in `image/`, and JavaScript in `js/`. Run the database setup from `scripts/`.

The portal can use the same MySQL database as the public booking inquiry form. Before setup, it uses the local sample data. The setup command adds the staff access and profile photo columns, registers or verifies the Director account, and enables MySQL for this copy of the portal. If MySQL was enabled before profile photos were added, run the same setup with the current Director credentials.

Run this in PowerShell from the ITE1 directory. Replace the example email and name. The password prompt masks what you type. Use at least 12 characters and at most 72 bytes.

```powershell
$portalPassword = Read-Host "Director password" -AsSecureString
$env:TEYVAT_ADMIN_PASSWORD = [System.Net.NetworkCredential]::new('', $portalPassword).Password
try {
    & C:/xampp/php/php.exe guild-portal/scripts/enable-mysql.php 'director@example.com' 'Director of Operations'
} finally {
    Remove-Item Env:TEYVAT_ADMIN_PASSWORD
}
```

The configured MySQL account needs permission to add the column on first setup and read and write the relevant portal records. Existing MySQL accounts keep their role and receive approved status if the column is new. Sample accounts and sample bookings stay in the local JSON files.

Staff and admins use the same [Guild Portal sign-in](http://localhost/ITelect/ITE1/guild-portal/index.php). The [public site](http://localhost/ITelect/ITE1/teyvat-site/company.html) has a separate home page.

Hover over or select the round avatar to open the sidebar. Use **Booking Queue** to review and assign public inquiries, **Staff Management** to manage access, and **Admin Overview** to review confirmed booking values. Values are calculated from the current package price and guest count for each travel date. In **Account Settings**, users can update their display name, photo, and password. Changing a password signs out the account’s other portal sessions.
