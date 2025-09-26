// Módulo principal que gerencia a galeria de fotos

// Módulo de gerenciamento de fotos
class PhotoManager {
    constructor() {
        this.photos = [];
        this.currentFilteredPhotos = [];
        this.categories = ['Viagens', 'Família', 'Natureza', 'Eventos', 'Trabalho'];
        this.loadPhotos();
    }

    loadPhotos() {
        const storedPhotos = localStorage.getItem('photos');
        const storedCategories = localStorage.getItem('categories');
        
        if (storedPhotos) {
            this.photos = JSON.parse(storedPhotos);
        }
        
        if (storedCategories) {
            this.categories = JSON.parse(storedCategories);
        }
        
        this.updateCategoriesSelect();
        return this.photos;
    }

    savePhotos() {
        localStorage.setItem('photos', JSON.stringify(this.photos));
        localStorage.setItem('categories', JSON.stringify(this.categories));
    }

    addPhoto(photoData) {
        const newPhoto = {
            id: Date.now() + Math.random(),
            name: photoData.name,
            type: photoData.type,
            size: photoData.size,
            dataURL: photoData.dataURL,
            thumbnailURL: photoData.thumbnailURL,
            uploadDate: new Date().toISOString(),
            title: photoData.title || '',
            tags: photoData.tags || [],
            category: photoData.category || '',
            favorite: false,
            metadata: {
                width: photoData.metadata?.width || 0,
                height: photoData.metadata?.height || 0,
                aspectRatio: photoData.metadata?.aspectRatio || 0
            }
        };
        
        this.photos.unshift(newPhoto);
        this.savePhotos();
        return newPhoto;
    }

    updatePhoto(id, updates) {
        const index = this.photos.findIndex(p => p.id == id);
        if (index !== -1) {
            this.photos[index] = { ...this.photos[index], ...updates };
            this.savePhotos();
            return this.photos[index];
        }
        return null;
    }

    deletePhoto(id) {
        const index = this.photos.findIndex(p => p.id == id);
        if (index !== -1) {
            this.photos.splice(index, 1);
            this.savePhotos();
            return true;
        }
        return false;
    }

    getPhotoById(id) {
        return this.photos.find(p => p.id == id);
    }

    toggleFavorite(id) {
        const photo = this.getPhotoById(id);
        if (photo) {
            photo.favorite = !photo.favorite;
            this.savePhotos();
            return photo.favorite;
        }
        return false;
    }

    addCategory(category) {
        if (!this.categories.includes(category)) {
            this.categories.push(category);
            this.savePhotos();
            this.updateCategoriesSelect();
            return true;
        }
        return false;
    }

    updateCategoriesSelect() {
        const categorySelect = document.getElementById('photo-category');
        if (categorySelect) {
            // Salvar valor atual
            const currentValue = categorySelect.value;
            
            // Limpar e reconstruir opções
            categorySelect.innerHTML = '<option value="">Sem categoria</option>';
            this.categories.forEach(category => {
                const option = document.createElement('option');
                option.value = category;
                option.textContent = category;
                categorySelect.appendChild(option);
            });
            
            // Restaurar valor se ainda existir
            if (this.categories.includes(currentValue)) {
                categorySelect.value = currentValue;
            }
        }
    }

    exportGallery() {
        const exportData = {
            photos: this.photos,
            categories: this.categories,
            exportDate: new Date().toISOString(),
            version: '1.0'
        };
        return JSON.stringify(exportData, null, 2);
    }

    importGallery(jsonData) {
        try {
            const data = JSON.parse(jsonData);
            
            if (data.photos && Array.isArray(data.photos)) {
                // Validar cada foto
                const validPhotos = data.photos.filter(photo => 
                    photo.id && photo.dataURL && photo.thumbnailURL
                );
                
                this.photos = validPhotos;
                
                if (data.categories && Array.isArray(data.categories)) {
                    this.categories = [...new Set([...this.categories, ...data.categories])];
                }
                
                this.savePhotos();
                return true;
            }
            return false;
        } catch (error) {
            console.error('Erro na importação:', error);
            return false;
        }
    }
}

// Módulo de gerenciamento do lightbox - VERSÃO MELHORADA
class LightboxManager {
    constructor(photoManager) {
        this.photoManager = photoManager;
        this.currentIndex = 0;
        this.isOpen = false;
        this.rotation = 0;
        this.isZoomed = false;
        this.initializeElements();
        this.setupEventListeners();
    }

    initializeElements() {
        this.lightbox = document.getElementById('lightbox');
        this.lightboxImage = document.getElementById('lightbox-image');
        this.lightboxTitle = document.getElementById('lightbox-title');
        this.lightboxFilename = document.getElementById('lightbox-filename');
        this.lightboxDate = document.getElementById('lightbox-date');
        this.lightboxSize = document.getElementById('lightbox-size');
        this.lightboxTags = document.getElementById('lightbox-tags');
        this.toggleFavorite = document.getElementById('toggle-favorite');
        this.prevButton = document.getElementById('prev-button');
        this.nextButton = document.getElementById('next-button');
        this.downloadButton = document.getElementById('download-button');
        this.rotateButton = document.getElementById('rotate-button');
        this.deleteButton = document.getElementById('delete-button');
        this.closeLightbox = document.getElementById('close-lightbox');
        this.saveEditButton = document.getElementById('save-edit-button');
        this.cancelEditButton = document.getElementById('cancel-edit-button');
        this.editButton = document.getElementById('edit-button');
        this.zoomButton = document.getElementById('lightbox-zoom');
        
        this.originalTitle = '';
        this.originalTags = '';
        this.isEditing = false;
        
        // REMOVER botão de zoom da interface
        if (this.zoomButton) {
            this.zoomButton.style.display = 'none';
        }
    }

    setupEventListeners() {
        this.prevButton.addEventListener('click', () => this.navigate(-1));
        this.nextButton.addEventListener('click', () => this.navigate(1));
        this.downloadButton.addEventListener('click', () => this.downloadCurrent());
        this.rotateButton.addEventListener('click', () => this.rotateImage());
        this.deleteButton.addEventListener('click', () => this.deleteCurrent());
        this.closeLightbox.addEventListener('click', () => this.close());
        this.saveEditButton.addEventListener('click', () => this.saveEdits());
        this.cancelEditButton.addEventListener('click', () => this.cancelEdits());
        this.toggleFavorite.addEventListener('click', () => this.toggleFavoriteCurrent());
        this.editButton.addEventListener('click', () => this.toggleEditMode());
        
        // Zoom com clique na imagem (substitui o botão)
        this.lightboxImage.addEventListener('click', (e) => {
            if (this.isZoomed) {
                this.resetZoom();
            } else {
                this.zoomImage(e);
            }
        });
        
        // Teclado
        document.addEventListener('keydown', (e) => this.handleKeydown(e));
        
        // Fechar ao clicar fora
        this.lightbox.addEventListener('click', (e) => {
            if (e.target === this.lightbox) this.close();
        });
        
        // Navegação por gestos (touch)
        this.setupTouchGestures();
    }

    setupTouchGestures() {
        let startX = 0;
        let startY = 0;
        
        this.lightboxImage.addEventListener('touchstart', (e) => {
            if (e.touches.length === 1) {
                startX = e.touches[0].clientX;
                startY = e.touches[0].clientY;
            }
        });
        
        this.lightboxImage.addEventListener('touchend', (e) => {
            if (!this.isZoomed && e.changedTouches.length === 1) {
                const endX = e.changedTouches[0].clientX;
                const endY = e.changedTouches[0].clientY;
                
                const diffX = startX - endX;
                const diffY = startY - endY;
                
                // Se foi um swipe horizontal (e não vertical)
                if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > 50) {
                    if (diffX > 0) {
                        this.navigate(1); // Swipe left = next
                    } else {
                        this.navigate(-1); // Swipe right = previous
                    }
                }
            }
        });
    }

    open(photoId, filteredPhotos = []) {
        const index = filteredPhotos.length > 0 
            ? filteredPhotos.findIndex(p => p.id == photoId)
            : this.photoManager.photos.findIndex(p => p.id == photoId);
            
        if (index === -1) return;
        
        this.currentIndex = index;
        this.currentFilteredPhotos = filteredPhotos.length > 0 ? filteredPhotos : this.photoManager.photos;
        this.isOpen = true;
        this.rotation = 0;
        this.isZoomed = false;
        
        this.updateLightbox();
        this.lightbox.style.display = 'flex';
        this.lightbox.setAttribute('aria-hidden', 'false');
        document.body.classList.add('modal-open');
        
        // Mostrar dica de teclado temporariamente
        this.showKeyboardHint();
    }

    close() {
        this.isOpen = false;
        this.lightbox.style.display = 'none';
        this.lightbox.setAttribute('aria-hidden', 'true');
        document.body.classList.remove('modal-open');
        this.rotation = 0;
        this.isZoomed = false;
        this.lightboxImage.style.transform = 'rotate(0deg)';
        this.lightboxImage.classList.remove('zoomed');
        
        if (this.isEditing) {
            this.cancelEdits();
        }
    }

    navigate(direction) {
        this.currentIndex = (this.currentIndex + direction + this.currentFilteredPhotos.length) % this.currentFilteredPhotos.length;
        this.rotation = 0;
        this.isZoomed = false;
        this.lightboxImage.classList.remove('zoomed');
        this.updateLightbox();
    }

    updateLightbox() {
        const photo = this.currentFilteredPhotos[this.currentIndex];
        if (!photo) return;
        
        this.lightboxImage.src = photo.dataURL;
        this.lightboxImage.alt = photo.title || photo.name;
        this.lightboxTitle.textContent = photo.title || 'Sem Título';
        this.lightboxFilename.textContent = `Arquivo: ${photo.name}`;
        this.lightboxDate.textContent = `Upload: ${new Date(photo.uploadDate).toLocaleString('pt-BR')}`;
        this.lightboxSize.textContent = `Tamanho: ${this.formatFileSize(photo.size)}`;
        this.lightboxTags.textContent = photo.tags.join(', ') || 'Nenhuma tag';
        
        // Atualizar favorito
        this.toggleFavorite.textContent = photo.favorite ? '★' : '☆';
        this.toggleFavorite.classList.toggle('active', photo.favorite);
        
        // Salvar valores originais para cancelamento
        this.originalTitle = photo.title || '';
        this.originalTags = photo.tags.join(', ') || '';
        
        // Aplicar rotação e resetar zoom
        this.lightboxImage.style.transform = `rotate(${this.rotation}deg)`;
        this.lightboxImage.classList.remove('zoomed');
        this.isZoomed = false;
        
        // Atualizar navegação
        this.updateNavigationButtons();
        
        // Atualizar modo de edição
        this.setEditMode(false);
    }

    toggleEditMode() {
        this.setEditMode(!this.isEditing);
    }

    setEditMode(editing) {
        this.isEditing = editing;
        
        if (editing) {
            this.lightboxTitle.setAttribute('contenteditable', 'true');
            this.lightboxTags.setAttribute('contenteditable', 'true');
            this.editButton.style.display = 'none';
            this.saveEditButton.parentElement.style.display = 'flex';
            this.lightboxTitle.focus();
        } else {
            this.lightboxTitle.setAttribute('contenteditable', 'false');
            this.lightboxTags.setAttribute('contenteditable', 'false');
            this.editButton.style.display = 'flex';
            this.saveEditButton.parentElement.style.display = 'none';
        }
    }

    saveEdits() {
        const photo = this.currentFilteredPhotos[this.currentIndex];
        if (!photo) return;
        
        const newTitle = this.lightboxTitle.textContent.trim();
        const newTags = this.lightboxTags.textContent.split(',').map(tag => tag.trim()).filter(tag => tag !== '');
        
        this.photoManager.updatePhoto(photo.id, {
            title: newTitle,
            tags: newTags
        });
        
        UIHelper.showToast('Edições salvas com sucesso!', 'success');
        this.originalTitle = newTitle;
        this.originalTags = newTags.join(', ');
        this.setEditMode(false);
        
        // Disparar evento para atualizar a galeria
        document.dispatchEvent(new CustomEvent('galleryUpdated'));
    }

    cancelEdits() {
        this.lightboxTitle.textContent = this.originalTitle || 'Sem Título';
        this.lightboxTags.textContent = this.originalTags || 'Nenhuma tag';
        this.setEditMode(false);
    }

    toggleFavoriteCurrent() {
        const photo = this.currentFilteredPhotos[this.currentIndex];
        if (!photo) return;
        
        const isFavorite = this.photoManager.toggleFavorite(photo.id);
        this.toggleFavorite.textContent = isFavorite ? '★' : '☆';
        this.toggleFavorite.classList.toggle('active', isFavorite);
        
        UIHelper.showToast(isFavorite ? 'Adicionado aos favoritos' : 'Removido dos favoritos', 'success');
        
        // Disparar evento para atualizar a galeria
        document.dispatchEvent(new CustomEvent('galleryUpdated'));
    }

    downloadCurrent() {
        const photo = this.currentFilteredPhotos[this.currentIndex];
        if (!photo) return;
        
        const a = document.createElement('a');
        a.href = photo.dataURL;
        a.download = photo.title ? `${photo.title}.${photo.name.split('.').pop()}` : photo.name;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        
        UIHelper.showToast('Download iniciado!', 'success');
    }

    rotateImage() {
        this.rotation = (this.rotation + 90) % 360;
        this.lightboxImage.style.transform = `rotate(${this.rotation}deg)`;
    }

    zoomImage(e) {
        if (this.isZoomed) return;
        
        const rect = this.lightboxImage.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        this.lightboxImage.style.transformOrigin = `${x}px ${y}px`;
        this.lightboxImage.classList.add('zoomed');
        this.isZoomed = true;
    }

    resetZoom() {
        this.lightboxImage.classList.remove('zoomed');
        this.isZoomed = false;
    }

    deleteCurrent() {
        const photo = this.currentFilteredPhotos[this.currentIndex];
        if (!photo) return;
        
        UIHelper.showConfirm(
            'Excluir Foto',
            `Tem certeza que deseja excluir "${photo.title || photo.name}"? Esta ação não pode ser desfeita.`,
            () => {
                if (this.photoManager.deletePhoto(photo.id)) {
                    UIHelper.showToast('Foto excluída com sucesso', 'success');
                    this.close();
                    // Disparar evento para atualizar a galeria
                    document.dispatchEvent(new CustomEvent('galleryUpdated'));
                } else {
                    UIHelper.showToast('Erro ao excluir a foto', 'error');
                }
            }
        );
    }

    updateNavigationButtons() {
        const prevBtn = this.prevButton;
        const nextBtn = this.nextButton;
        
        prevBtn.disabled = this.currentIndex === 0;
        nextBtn.disabled = this.currentIndex === this.currentFilteredPhotos.length - 1;
        
        // Atualizar ARIA labels
        prevBtn.setAttribute('aria-label', 
            this.currentIndex === 0 ? 'Primeira foto' : 'Foto anterior');
        nextBtn.setAttribute('aria-label', 
            this.currentIndex === this.currentFilteredPhotos.length - 1 ? 'Última foto' : 'Próxima foto');
    }

    showKeyboardHint() {
        const hint = document.createElement('div');
        hint.className = 'keyboard-hint';
        hint.textContent = '← → para navegar • F para favorito • ESC para sair';
        this.lightboxImageContainer.appendChild(hint);
        
        setTimeout(() => {
            if (hint.parentNode) {
                hint.parentNode.removeChild(hint);
            }
        }, 3000);
    }

    get lightboxImageContainer() {
        return this.lightbox.querySelector('.lightbox-image-container');
    }

    handleKeydown(e) {
        if (!this.isOpen) return;
        
        switch(e.key) {
            case 'ArrowLeft':
                e.preventDefault();
                this.navigate(-1);
                break;
            case 'ArrowRight':
                e.preventDefault();
                this.navigate(1);
                break;
            case 'Escape':
                e.preventDefault();
                if (this.isZoomed) {
                    this.resetZoom();
                } else {
                    this.close();
                }
                break;
            case ' ':
                e.preventDefault();
                this.toggleFavoriteCurrent();
                break;
            case 'f':
            case 'F':
                e.preventDefault();
                this.toggleFavoriteCurrent();
                break;
            case 'e':
            case 'E':
                if (e.ctrlKey) {
                    e.preventDefault();
                    this.toggleEditMode();
                }
                break;
            case 'r':
            case 'R':
                if (e.ctrlKey) {
                    e.preventDefault();
                    this.rotateImage();
                }
                break;
            case 'z':
            case 'Z':
                if (e.ctrlKey) {
                    e.preventDefault();
                    if (this.isZoomed) {
                        this.resetZoom();
                    } else {
                        // Zoom no centro da imagem
                        const rect = this.lightboxImage.getBoundingClientRect();
                        this.lightboxImage.style.transformOrigin = 'center';
                        this.zoomImage({ clientX: rect.left + rect.width / 2, clientY: rect.top + rect.height / 2 });
                    }
                }
                break;
        }
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
}

// Módulo de gerenciamento de upload
class UploadManager {
    constructor(photoManager) {
        this.photoManager = photoManager;
        this.filesToUpload = [];
        this.initializeElements();
        this.setupEventListeners();
    }

    initializeElements() {
        this.uploadModal = document.getElementById('upload-modal');
        this.uploadForm = document.getElementById('upload-form');
        this.dropArea = document.getElementById('drop-area');
        this.fileInput = document.getElementById('file-input');
        this.uploadPreview = document.getElementById('upload-preview');
        this.previewContainer = document.getElementById('preview-container');
        this.fileCount = document.getElementById('file-count');
        this.uploadSubmit = document.getElementById('upload-submit');
        this.closeUploadModal = document.getElementById('close-upload-modal');
        this.cancelUpload = document.getElementById('cancel-upload');
    }

    setupEventListeners() {
        // Abrir modal
        document.getElementById('upload-button').addEventListener('click', () => this.openModal());
        
        // Fechar modal
        this.closeUploadModal.addEventListener('click', () => this.closeModal());
        this.cancelUpload.addEventListener('click', () => this.closeModal());
        
        // Drag and drop
        this.setupDragAndDrop();
        
        // Seleção de arquivos
        this.fileInput.addEventListener('change', (e) => this.handleFileSelect(e.target.files));
        
        // Envio do formulário
        this.uploadForm.addEventListener('submit', (e) => this.handleSubmit(e));
        
        // Fechar ao clicar fora
        this.uploadModal.addEventListener('click', (e) => {
            if (e.target === this.uploadModal) this.closeModal();
        });
    }

    setupDragAndDrop() {
        // Prevenir comportamentos padrão
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            this.dropArea.addEventListener(eventName, preventDefaults, false);
        });

        function preventDefaults(e) {
            e.preventDefault();
            e.stopPropagation();
        }

        // Destacar área de drop
        ['dragenter', 'dragover'].forEach(eventName => {
            this.dropArea.addEventListener(eventName, () => this.highlight(), false);
        });

        ['dragleave', 'drop'].forEach(eventName => {
            this.dropArea.addEventListener(eventName, () => this.unhighlight(), false);
        });

        // Manipular drop
        this.dropArea.addEventListener('drop', (e) => {
            const dt = e.dataTransfer;
            const files = dt.files;
            this.handleFileSelect(files);
        }, false);

        // Clique para selecionar
        this.dropArea.addEventListener('click', () => this.fileInput.click());
    }

    highlight() {
        this.dropArea.classList.add('highlight');
    }

    unhighlight() {
        this.dropArea.classList.remove('highlight');
    }

    openModal() {
        this.uploadModal.style.display = 'flex';
        this.uploadModal.setAttribute('aria-hidden', 'false');
        document.body.classList.add('modal-open');
    }

    closeModal() {
        this.uploadModal.style.display = 'none';
        this.uploadModal.setAttribute('aria-hidden', 'true');
        document.body.classList.remove('modal-open');
        this.resetForm();
    }

    resetForm() {
        this.uploadForm.reset();
        this.filesToUpload = [];
        this.uploadPreview.style.display = 'none';
        this.uploadSubmit.disabled = true;
        this.previewContainer.innerHTML = '';
    }

    handleFileSelect(files) {
        const validFiles = Array.from(files).filter(file => 
            file.type.startsWith('image/') && file.size <= 10 * 1024 * 1024 // 10MB max
        );
        
        if (validFiles.length === 0) {
            if (files.length > 0) {
                UIHelper.showToast('Por favor, selecione apenas imagens válidas (máx. 10MB cada)', 'warning');
            }
            return;
        }
        
        this.filesToUpload = validFiles;
        this.updatePreview();
        this.uploadSubmit.disabled = false;
    }

    updatePreview() {
        this.previewContainer.innerHTML = '';
        this.fileCount.textContent = this.filesToUpload.length;
        
        this.filesToUpload.forEach((file, index) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const previewItem = document.createElement('div');
                previewItem.className = 'preview-item';
                previewItem.innerHTML = `
                    <img src="${e.target.result}" alt="${file.name}">
                    <button class="remove-preview" data-index="${index}">×</button>
                `;
                this.previewContainer.appendChild(previewItem);
                
                // Adicionar evento para remover pré-visualização
                previewItem.querySelector('.remove-preview').addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.removeFile(index);
                });
            };
            reader.readAsDataURL(file);
        });
        
        this.uploadPreview.style.display = 'block';
    }

    removeFile(index) {
        this.filesToUpload.splice(index, 1);
        if (this.filesToUpload.length === 0) {
            this.resetForm();
        } else {
            this.updatePreview();
        }
    }

    async handleSubmit(e) {
        e.preventDefault();
        
        if (this.filesToUpload.length === 0) {
            UIHelper.showToast('Nenhuma imagem selecionada', 'warning');
            return;
        }
        
        this.uploadSubmit.disabled = true;
        this.uploadSubmit.textContent = 'Processando...';
        
        const title = document.getElementById('photo-title').value;
        const tags = document.getElementById('photo-tags').value.split(',').map(tag => tag.trim()).filter(tag => tag !== '');
        const category = document.getElementById('photo-category').value;
        const compress = document.getElementById('compress-images').checked;
        
        try {
            for (const file of this.filesToUpload) {
                await this.processFile(file, title, tags, category, compress);
            }
            
            UIHelper.showToast(`${this.filesToUpload.length} foto(s) adicionada(s) com sucesso!`, 'success');
            this.closeModal();
            
            // Disparar evento para atualizar a galeria
            document.dispatchEvent(new CustomEvent('galleryUpdated'));
            
        } catch (error) {
            console.error('Erro no upload:', error);
            UIHelper.showToast('Erro ao processar as imagens', 'error');
        } finally {
            this.uploadSubmit.disabled = false;
            this.uploadSubmit.textContent = 'Processar Fotos';
        }
    }

    async processFile(file, title, tags, category, compress) {
        return new Promise((resolve, reject) => {
            // Processar imagem principal
            const processMainImage = (callback) => {
                const reader = new FileReader();
                reader.onload = (e) => {
                    if (compress) {
                        this.compressImage(e.target.result, 0.8, (compressedDataURL) => {
                            callback(compressedDataURL);
                        });
                    } else {
                        callback(e.target.result);
                    }
                };
                reader.onerror = reject;
                reader.readAsDataURL(file);
            };
            
            // Processar thumbnail
            const processThumbnail = (callback) => {
                const reader = new FileReader();
                reader.onload = (e) => {
                    this.generateThumbnail(e.target.result, 200, 200, (thumbnailURL) => {
                        callback(thumbnailURL);
                    });
                };
                reader.onerror = reject;
                reader.readAsDataURL(file);
            };
            
            // Obter metadados da imagem
            const getMetadata = (callback) => {
                const img = new Image();
                img.onload = () => {
                    callback({
                        width: img.width,
                        height: img.height,
                        aspectRatio: img.width / img.height
                    });
                };
                img.onerror = reject;
                img.src = URL.createObjectURL(file);
            };
            
            // Executar todos os processos em paralelo
            Promise.all([
                new Promise(processMainImage),
                new Promise(processThumbnail),
                new Promise(getMetadata)
            ]).then(([dataURL, thumbnailURL, metadata]) => {
                // Adicionar foto ao gerenciador
                this.photoManager.addPhoto({
                    name: file.name,
                    type: file.type,
                    size: file.size,
                    dataURL: dataURL,
                    thumbnailURL: thumbnailURL,
                    title: title,
                    tags: tags,
                    category: category,
                    metadata: metadata
                });
                
                resolve();
            }).catch(reject);
        });
    }

    compressImage(dataURL, quality, callback) {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0);
            
            callback(canvas.toDataURL('image/jpeg', quality));
        };
        img.src = dataURL;
    }

    generateThumbnail(dataURL, maxWidth, maxHeight, callback) {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            let width = img.width;
            let height = img.height;
            
            // Calcular dimensões mantendo aspect ratio
            if (width > height) {
                if (width > maxWidth) {
                    height *= maxWidth / width;
                    width = maxWidth;
                }
            } else {
                if (height > maxHeight) {
                    width *= maxHeight / height;
                    height = maxHeight;
                }
            }
            
            canvas.width = width;
            canvas.height = height;
            
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);
            
            callback(canvas.toDataURL('image/jpeg', 0.7));
        };
        img.src = dataURL;
    }
}

// Módulo de gerenciamento de filtros - VERSÃO MELHORADA COM FAVORITOS
class FilterManager {
    constructor(photoManager) {
        this.photoManager = photoManager;
        this.activeTags = new Set();
        this.currentCategory = 'all';
        this.searchTerm = '';
        this.sortBy = 'uploadDate-desc';
        this.initializeElements();
        this.setupEventListeners();
    }

    initializeElements() {
        this.searchInput = document.getElementById('search-input');
        this.clearSearch = document.getElementById('clear-search');
        this.sortSelect = document.getElementById('sort-select');
        this.tagFiltersContainer = document.getElementById('tag-filters');
        this.clearFilters = document.getElementById('clear-filters');
        this.photoGrid = document.getElementById('photo-grid');
        this.galleryStatus = document.getElementById('gallery-status');
        this.loadMoreBtn = document.getElementById('load-more');
        
        this.currentPage = 1;
        this.photosPerPage = 20;
    }

    setupEventListeners() {
        this.searchInput.addEventListener('input', () => this.handleSearch());
        this.clearSearch.addEventListener('click', () => this.clearSearchHandler());
        this.sortSelect.addEventListener('change', () => this.handleSortChange());
        this.clearFilters.addEventListener('click', () => this.clearAllFilters());
        this.loadMoreBtn.addEventListener('click', () => this.loadMore());
        
        // Categorias - AGORA COM FAVORITOS FUNCIONAL
        document.querySelectorAll('.category-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.handleCategoryChange(e.target.dataset.category));
        });
        
        // Atualizar galeria quando fotos forem adicionadas/removidas
        document.addEventListener('galleryUpdated', () => {
            this.currentPage = 1;
            this.applyFilters();
        });
    }

    handleSearch() {
        this.searchTerm = this.searchInput.value.toLowerCase();
        this.clearSearch.style.display = this.searchTerm ? 'block' : 'none';
        this.currentPage = 1;
        this.applyFilters();
    }

    clearSearchHandler() {
        this.searchInput.value = '';
        this.searchTerm = '';
        this.clearSearch.style.display = 'none';
        this.currentPage = 1;
        this.applyFilters();
    }

    handleSortChange() {
        this.sortBy = this.sortSelect.value;
        this.currentPage = 1;
        this.applyFilters();
    }

    handleCategoryChange(category) {
        this.currentCategory = category;
        
        // Atualizar botões de categoria
        document.querySelectorAll('.category-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.category === category);
        });
        
        this.currentPage = 1;
        this.applyFilters();
    }

    toggleTag(tag) {
        if (this.activeTags.has(tag)) {
            this.activeTags.delete(tag);
        } else {
            this.activeTags.add(tag);
        }
        this.currentPage = 1;
        this.applyFilters();
        this.generateTagFilters();
    }

    clearAllFilters() {
        this.activeTags.clear();
        this.searchTerm = '';
        this.searchInput.value = '';
        this.clearSearch.style.display = 'none';
        this.currentCategory = 'all';
        
        document.querySelectorAll('.category-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.category === 'all');
        });
        
        this.currentPage = 1;
        this.applyFilters();
        this.generateTagFilters();
    }

    applyFilters() {
        let filtered = [...this.photoManager.photos];
        
        // FILTRO POR CATEGORIA - AGORA FUNCIONAL PARA FAVORITOS
        if (this.currentCategory === 'recent') {
            const oneWeekAgo = new Date();
            oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
            filtered = filtered.filter(photo => new Date(photo.uploadDate) > oneWeekAgo);
        } else if (this.currentCategory === 'favorites') {
            // FILTRO DE FAVORITOS CORRIGIDO
            filtered = filtered.filter(photo => photo.favorite === true);
        } else if (this.currentCategory && this.currentCategory !== 'all') {
            filtered = filtered.filter(photo => photo.category === this.currentCategory);
        }
        
        // Filtro por busca
        if (this.searchTerm) {
            filtered = filtered.filter(photo =>
                (photo.title && photo.title.toLowerCase().includes(this.searchTerm)) ||
                (photo.name && photo.name.toLowerCase().includes(this.searchTerm)) ||
                (photo.tags && photo.tags.some(tag => tag.toLowerCase().includes(this.searchTerm))) ||
                (photo.category && photo.category.toLowerCase().includes(this.searchTerm))
            );
        }
        
        // Filtro por tags
        if (this.activeTags.size > 0) {
            filtered = filtered.filter(photo =>
                photo.tags && photo.tags.some(tag => this.activeTags.has(tag))
            );
        }
        
        // Ordenação
        filtered.sort((a, b) => {
            switch(this.sortBy) {
                case 'uploadDate-desc':
                    return new Date(b.uploadDate) - new Date(a.uploadDate);
                case 'uploadDate-asc':
                    return new Date(a.uploadDate) - new Date(b.uploadDate);
                case 'title-asc':
                    return (a.title || a.name).localeCompare(b.title || b.name, 'pt-BR', { sensitivity: 'base' });
                case 'title-desc':
                    return (b.title || b.name).localeCompare(a.title || a.name, 'pt-BR', { sensitivity: 'base' });
                case 'size-desc':
                    return b.size - a.size;
                case 'size-asc':
                    return a.size - b.size;
                default:
                    return 0;
            }
        });
        
        this.filteredPhotos = filtered;
        this.renderPhotos();
    }

    renderPhotos() {
        const startIndex = 0;
        const endIndex = this.currentPage * this.photosPerPage;
        const photosToShow = this.filteredPhotos.slice(startIndex, endIndex);
        
        // Mostrar/Ocultar botão "Carregar Mais"
        this.loadMoreBtn.style.display = endIndex < this.filteredPhotos.length ? 'block' : 'none';
        
        if (this.currentPage === 1) {
            this.photoGrid.innerHTML = '';
            
            if (this.filteredPhotos.length === 0) {
                this.photoGrid.innerHTML = `
                    <div class="empty-state" style="grid-column: 1 / -1; text-align: center; padding: 3rem;">
                        <div class="empty-icon">📷</div>
                        <h3>Nenhuma foto encontrada</h3>
                        <p>Tente ajustar os filtros ou fazer upload de novas fotos</p>
                        <button id="upload-from-empty" class="btn-primary" style="margin-top: 1rem;">Fazer Upload de Fotos</button>
                    </div>
                `;
                
                document.getElementById('upload-from-empty')?.addEventListener('click', () => {
                    document.getElementById('upload-button').click();
                });
                
                this.galleryStatus.textContent = 'Nenhuma foto corresponde aos filtros aplicados';
                return;
            }
        }
        
        photosToShow.forEach(photo => {
            const photoItem = this.createPhotoElement(photo);
            this.photoGrid.appendChild(photoItem);
        });
        
        // Atualizar status
        const totalCount = this.filteredPhotos.length;
        const showingCount = photosToShow.length;
        this.galleryStatus.textContent = `Mostrando ${showingCount} de ${totalCount} fotos`;
        
        this.generateTagFilters();
    }

    createPhotoElement(photo) {
        const photoItem = document.createElement('div');
        photoItem.className = 'photo-item';
        photoItem.dataset.id = photo.id;
        photoItem.setAttribute('tabindex', '0');
        photoItem.setAttribute('role', 'button');
        photoItem.setAttribute('aria-label', `Ver foto ${photo.title || photo.name}`);
        
        photoItem.innerHTML = `
            ${photo.favorite ? '<div class="favorite-indicator" title="Favorita">★</div>' : ''}
            <img src="${photo.thumbnailURL}" alt="${photo.title || photo.name}" loading="lazy">
            <div class="photo-info">
                <div class="photo-title">${photo.title || photo.name}</div>
                <div class="photo-meta">
                    <span>${new Date(photo.uploadDate).toLocaleDateString('pt-BR')}</span>
                    <span>${this.formatFileSize(photo.size)}</span>
                </div>
            </div>
        `;
        
        photoItem.addEventListener('click', () => {
            // Disparar evento personalizado para abrir lightbox
            document.dispatchEvent(new CustomEvent('openLightbox', {
                detail: { photoId: photo.id, filteredPhotos: this.filteredPhotos }
            }));
        });
        
        // Duplo clique para favoritar
        photoItem.addEventListener('dblclick', () => {
            this.photoManager.toggleFavorite(photo.id);
            document.dispatchEvent(new CustomEvent('galleryUpdated'));
            UIHelper.showToast(photo.favorite ? 'Removido dos favoritos' : 'Adicionado aos favoritos', 'success');
        });
        
        return photoItem;
    }

    generateTagFilters() {
        this.tagFiltersContainer.innerHTML = '';
        
        const allTags = new Set();
        this.photoManager.photos.forEach(photo => {
            if (photo.tags) {
                photo.tags.forEach(tag => allTags.add(tag));
            }
        });
        
        if (allTags.size === 0) return;
        
        const tagsArray = Array.from(allTags).sort();
        
        tagsArray.forEach(tag => {
            const tagChip = document.createElement('span');
            tagChip.className = `tag-chip ${this.activeTags.has(tag) ? 'active' : ''}`;
            tagChip.textContent = tag;
            tagChip.setAttribute('tabindex', '0');
            tagChip.setAttribute('role', 'button');
            tagChip.setAttribute('aria-pressed', this.activeTags.has(tag));
            tagChip.setAttribute('aria-label', `Filtrar por tag: ${tag}`);
            
            tagChip.addEventListener('click', () => this.toggleTag(tag));
            tagChip.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    this.toggleTag(tag);
                }
            });
            
            this.tagFiltersContainer.appendChild(tagChip);
        });
    }

    loadMore() {
        this.currentPage++;
        this.renderPhotos();
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    }
}

// Módulo de utilitários de UI
class UIHelper {
    static showToast(message, type = 'info', duration = 3000) {
        const toast = document.getElementById('toast');
        toast.textContent = message;
        toast.className = `toast ${type} show`;
        
        setTimeout(() => {
            toast.classList.remove('show');
        }, duration);
    }

    static showConfirm(title, message, onConfirm, onCancel = null) {
        const confirmModal = document.getElementById('confirm-modal');
        const confirmTitle = document.getElementById('confirm-title');
        const confirmMessage = document.getElementById('confirm-message');
        const confirmOk = document.getElementById('confirm-ok');
        const confirmCancel = document.getElementById('confirm-cancel');
        
        confirmTitle.textContent = title;
        confirmMessage.textContent = message;
        
        confirmModal.style.display = 'flex';
        confirmModal.setAttribute('aria-hidden', 'false');
        document.body.classList.add('modal-open');
        
        const cleanup = () => {
            confirmModal.style.display = 'none';
            confirmModal.setAttribute('aria-hidden', 'true');
            document.body.classList.remove('modal-open');
            
            confirmOk.removeEventListener('click', handleOk);
            confirmCancel.removeEventListener('click', handleCancel);
        };
        
        const handleOk = () => {
            cleanup();
            onConfirm();
        };
        
        const handleCancel = () => {
            cleanup();
            if (onCancel) onCancel();
        };
        
        confirmOk.addEventListener('click', handleOk);
        confirmCancel.addEventListener('click', handleCancel);
        
        // Fechar ao clicar fora ou pressionar ESC
        const handleOutsideClick = (e) => {
            if (e.target === confirmModal) handleCancel();
        };
        
        const handleKeydown = (e) => {
            if (e.key === 'Escape') handleCancel();
        };
        
        confirmModal.addEventListener('click', handleOutsideClick);
        document.addEventListener('keydown', handleKeydown);
        
        // Limpar event listeners após fechar
        setTimeout(() => {
            confirmModal.removeEventListener('click', handleOutsideClick);
            document.removeEventListener('keydown', handleKeydown);
        }, 100);
    }
}

// Módulo de importação/exportação
class ImportExportManager {
    constructor(photoManager) {
        this.photoManager = photoManager;
        this.setupEventListeners();
    }

    setupEventListeners() {
        document.getElementById('export-button').addEventListener('click', () => this.exportGallery());
        document.getElementById('import-button').addEventListener('click', () => this.importGallery());
        document.getElementById('import-input').addEventListener('change', (e) => this.handleImportFile(e));
    }

    exportGallery() {
        const dataStr = this.photoManager.exportGallery();
        const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
        const exportFileDefaultName = `galeria_fotos_${new Date().toISOString().split('T')[0]}.json`;

        const linkElement = document.createElement('a');
        linkElement.setAttribute('href', dataUri);
        linkElement.setAttribute('download', exportFileDefaultName);
        document.body.appendChild(linkElement);
        linkElement.click();
        document.body.removeChild(linkElement);
        
        UIHelper.showToast('Galeria exportada com sucesso!', 'success');
    }

    importGallery() {
        document.getElementById('import-input').click();
    }

    handleImportFile(event) {
        const file = event.target.files[0];
        if (!file) return;

        // Verificar tamanho do arquivo (max 10MB)
        if (file.size > 10 * 1024 * 1024) {
            UIHelper.showToast('Arquivo muito grande. Máximo 10MB permitido.', 'error');
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            UIHelper.showConfirm(
                'Importar Galeria',
                'Esta ação substituirá sua galeria atual. Tem certeza que deseja continuar?',
                () => {
                    if (this.photoManager.importGallery(e.target.result)) {
                        UIHelper.showToast('Galeria importada com sucesso!', 'success');
                        document.dispatchEvent(new CustomEvent('galleryUpdated'));
                    } else {
                        UIHelper.showToast('Erro ao importar a galeria. Verifique o formato do arquivo.', 'error');
                    }
                }
            );
        };
        reader.onerror = () => {
            UIHelper.showToast('Erro ao ler o arquivo.', 'error');
        };
        reader.readAsText(file);
        
        // Resetar o input para permitir importar o mesmo arquivo novamente
        event.target.value = '';
    }
}

// Inicialização da aplicação
class GalleryApp {
    constructor() {
        this.photoManager = new PhotoManager();
        this.lightboxManager = new LightboxManager(this.photoManager);
        this.uploadManager = new UploadManager(this.photoManager);
        this.filterManager = new FilterManager(this.photoManager);
        this.importExportManager = new ImportExportManager(this.photoManager);
        
        this.setupGlobalEventListeners();
        this.initializeApp();
    }

    setupGlobalEventListeners() {
        // Lightbox global
        document.addEventListener('openLightbox', (e) => {
            this.lightboxManager.open(e.detail.photoId, e.detail.filteredPhotos);
        });
        
        // Atualizar filtros quando a galeria for atualizada
        document.addEventListener('galleryUpdated', () => {
            this.filterManager.applyFilters();
        });
        
        // Teclas de atalho globais
        document.addEventListener('keydown', (e) => {
            // Ctrl+U para upload (quando não está em um campo de entrada)
            if (e.ctrlKey && e.key === 'u' && !this.isInputFocused()) {
                e.preventDefault();
                document.getElementById('upload-button').click();
            }
            
            // Ctrl+F para focar na busca
            if (e.ctrlKey && e.key === 'f' && !this.isInputFocused()) {
                e.preventDefault();
                document.getElementById('search-input').focus();
            }
        });
    }

    isInputFocused() {
        const activeElement = document.activeElement;
        return activeElement.tagName === 'INPUT' || 
               activeElement.tagName === 'TEXTAREA' ||
               activeElement.isContentEditable;
    }

    initializeApp() {
        // Aplicar filtros iniciais
        this.filterManager.applyFilters();
        
        // Mostrar mensagem de boas-vindas para usuários novos
        if (this.photoManager.photos.length === 0) {
            setTimeout(() => {
                UIHelper.showToast(
                    'Bem-vindo à sua galeria de fotos! Clique em "Upload" para adicionar suas primeiras fotos.', 
                    'info', 
                    5000
                );
            }, 1000);
        }
        
        console.log('Galeria de Fotos inicializada com sucesso!');
    }
}

// Inicializar a aplicação quando o DOM estiver carregado
document.addEventListener('DOMContentLoaded', () => {
    new GalleryApp();
});

// Service Worker para funcionalidade offline (opcional)
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then(registration => {
                console.log('SW registered: ', registration);
            })
            .catch(registrationError => {
                console.log('SW registration failed: ', registrationError);
            });
    });
}