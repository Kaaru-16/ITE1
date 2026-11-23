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

// Keep the square crop inside the source image at every zoom level.
function drawPhotoCrop(canvas, image, zoom, horizontal, vertical) {
    const size = Math.min(image.width, image.height) / zoom;
    const left = (image.width - size) * horizontal;
    const top = (image.height - size) * vertical;
    const context = canvas.getContext('2d', { alpha: false });
    context.fillStyle = '#fff';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, left, top, size, size, 0, 0, canvas.width, canvas.height);
}

export function bindProfileForms({ getUser, updateUser, post, showMessage }) {
    const form = byId('profileForm');
    const photoInput = byId('profilePhoto');
    const nameInput = byId('profileName');
    const adjustPhoto = byId('adjustProfilePhoto');
    const removeButton = byId('removeProfilePhoto');
    const editor = byId('profilePhotoEditor');
    const canvas = byId('profileCropPreview');
    const zoom = byId('profileCropZoom');
    const horizontal = byId('profileCropX');
    const vertical = byId('profileCropY');

    let removePhoto = false;
    let cropImage = null;
    let cropDirty = false;
    let imageRequest = 0;
    let loadingPhoto = false;

    function showCropEditor(open) {
        editor.classList.toggle('hidden', !open);
        adjustPhoto.setAttribute('aria-expanded', String(open));
        adjustPhoto.textContent = open ? 'Hide crop controls' : 'Adjust photo';
    }

    function clearCrop() {
        imageRequest++;
        loadingPhoto = false;
        cropImage?.close();
        cropImage = null;
        cropDirty = false;
        showCropEditor(false);
    }

    function refreshProfilePreview() {
        const photo = !removePhoto && getUser().profile_photo;
        paintAvatar(byId('profilePreview'), nameInput.value, photo);
        adjustPhoto.classList.toggle('hidden', !photo && !cropImage);
        removeButton.classList.toggle('hidden', !photo && !cropImage);
    }

    function renderCrop() {
        if (!cropImage) return;
        drawPhotoCrop(canvas, cropImage, zoom.valueAsNumber, horizontal.valueAsNumber / 100, vertical.valueAsNumber / 100);
    }

    function resetCrop() {
        for (const control of [zoom, horizontal, vertical]) control.value = control.defaultValue;
        renderCrop();
    }

    async function loadCrop(source, isNewPhoto) {
        clearCrop();
        const request = imageRequest;
        loadingPhoto = true;
        showMessage('profileMessage');
        try {
            const file = isNewPhoto ? source : await (await fetch(source)).blob();
            const image = await createImageBitmap(file);
            // A reset or another file selection can supersede a pending decode.
            if (request !== imageRequest) {
                image.close();
                return;
            }
            cropImage = image;
            cropDirty = isNewPhoto;
            removePhoto = false;
            resetCrop();
            showCropEditor(true);
            refreshProfilePreview();
        } catch {
            if (request !== imageRequest) return;
            photoInput.value = '';
            clearCrop();
            refreshProfilePreview();
            showMessage('profileMessage', 'The photo could not be opened. Choose another image and try again.');
        } finally {
            if (request === imageRequest) loadingPhoto = false;
        }
    }

    function resetProfileForms() {
        const user = getUser();
        removePhoto = false;
        clearCrop();
        form.reset();
        byId('passwordForm').reset();
        nameInput.value = user.name;
        byId('profileEmail').value = user.email;
        byId('passwordUsername').value = user.email;
        refreshProfilePreview();
        showMessage('profileMessage');
        showMessage('passwordMessage');
    }

    nameInput.addEventListener('input', refreshProfilePreview);
    photoInput.addEventListener('change', () => {
        const file = photoInput.files[0];
        if (!file) return;
        if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024) {
            photoInput.value = '';
            clearCrop();
            refreshProfilePreview();
            showMessage('profileMessage', 'Choose a JPEG, PNG, or WebP image up to 5 MB.');
            return;
        }
        loadCrop(file, true);
    });
    adjustPhoto.addEventListener('click', () => {
        if (loadingPhoto) return;
        if (cropImage) showCropEditor(editor.classList.contains('hidden'));
        else if (getUser().profile_photo) loadCrop(getUser().profile_photo, false);
    });
    removeButton.addEventListener('click', () => {
        removePhoto = true;
        photoInput.value = '';
        clearCrop();
        refreshProfilePreview();
    });
    for (const control of [zoom, horizontal, vertical]) {
        control.addEventListener('input', () => {
            cropDirty = true;
            renderCrop();
        });
    }
    byId('resetProfileCrop').addEventListener('click', resetCrop);

    form.addEventListener('submit', async event => {
        event.preventDefault();
        const button = form.querySelector('[type="submit"]');
        if (button.disabled || loadingPhoto) return;
        button.disabled = true;
        const payload = { name: nameInput.value };
        try {
            if (cropDirty) payload.profile_photo = canvas.toDataURL('image/jpeg', 0.82);
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