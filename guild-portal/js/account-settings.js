const byId = id => document.getElementById(id);

export function paintAvatar(target, name, photo) {
    target.replaceChildren();
    if (photo) {
        const image = document.createElement('img');
        image.src = photo;
        image.alt = '';
        target.append(image);
    } else {
        target.textContent = name.trim().split(/\s+/u).slice(0, 2).map(word => Array.from(word)[0]).join('').toUpperCase();
    }
}

// Resize and re-encode photos before sending them to the portal.
async function prepareProfilePhoto(file) {
    const image = await createImageBitmap(file);
    try {
        const size = Math.min(image.width, image.height);
        const canvas = document.createElement('canvas');
        canvas.width = canvas.height = 256;
        const context = canvas.getContext('2d', { alpha: false });
        context.fillStyle = '#ffffff';
        context.fillRect(0, 0, 256, 256);
        context.drawImage(image, (image.width - size) / 2, (image.height - size) / 2, size, size, 0, 0, 256, 256);
        return canvas.toDataURL('image/jpeg', 0.82);
    } finally {
        image.close();
    }
}

export function bindProfileForms({ getUser, updateUser, post, showMessage }) {
    let removePhoto = false;
    let previewUrl = '';

    function refreshProfilePreview(file) {
        if (previewUrl) URL.revokeObjectURL(previewUrl);
        previewUrl = file ? URL.createObjectURL(file) : '';
        const photo = previewUrl || (!removePhoto && getUser().profile_photo);
        paintAvatar(byId('profilePreview'), byId('profileName').value, photo);
        byId('removeProfilePhoto').classList.toggle('hidden', !photo);
    }

    function resetProfileForms() {
        const user = getUser();
        removePhoto = false;
        byId('profileForm').reset();
        byId('passwordForm').reset();
        byId('profileName').value = user.name;
        byId('profileEmail').value = user.email;
        byId('passwordUsername').value = user.email;
        refreshProfilePreview();
        showMessage('profileMessage');
        showMessage('passwordMessage');
    }

    const form = byId('profileForm');
    const photoInput = byId('profilePhoto');
    const nameInput = byId('profileName');
    nameInput.addEventListener('input', () => {
        if (!previewUrl) refreshProfilePreview();
    });
    photoInput.addEventListener('change', () => {
        const file = photoInput.files[0];
        if (file && (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024)) {
            photoInput.value = '';
            refreshProfilePreview();
            showMessage('profileMessage', 'Choose a JPEG, PNG, or WebP image up to 5 MB.');
            return;
        }
        showMessage('profileMessage');
        refreshProfilePreview(file);
    });
    byId('removeProfilePhoto').addEventListener('click', () => {
        removePhoto = true;
        photoInput.value = '';
        refreshProfilePreview();
    });
    form.addEventListener('submit', async event => {
        event.preventDefault();
        const button = form.querySelector('[type="submit"]');
        button.disabled = true;
        const payload = { name: nameInput.value };
        try {
            const file = photoInput.files[0];
            if (file) payload.profile_photo = await prepareProfilePhoto(file);
            else if (removePhoto) payload.profile_photo = null;
            const result = await post('update_profile', payload);
            if (!result.success) {
                showMessage('profileMessage', result.error || 'The profile could not be saved.');
                return;
            }
            updateUser(result.user);
            resetProfileForms();
            showMessage('profileMessage', 'Profile saved.', true);
        } catch {
            showMessage('profileMessage', 'The photo could not be opened. Choose another image and try again.');
        } finally {
            button.disabled = false;
        }
    });

    const passwordForm = byId('passwordForm');
    passwordForm.addEventListener('submit', async event => {
        event.preventDefault();
        const button = passwordForm.querySelector('[type="submit"]');
        button.disabled = true;
        const result = await post('change_password', {
            current_password: byId('currentPassword').value,
            new_password: byId('newPassword').value,
            confirm_password: byId('confirmPassword').value
        });
        button.disabled = false;
        if (result.success) {
            passwordForm.reset();
            byId('passwordUsername').value = getUser().email;
        }
        showMessage('passwordMessage', result.success ? 'Password changed.' : (result.error || 'The password could not be changed.'), result.success);
    });

    return resetProfileForms;
}
