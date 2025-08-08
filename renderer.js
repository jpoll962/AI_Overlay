class AIChat {
    constructor() {
        this.currentModel = 'ollama';
        this.isConnected = false;
        this.currentConversation = [];
        this.messageCount = 0;
        this.sessionStartTime = Date.now();
        this.isMinimized = false;
        this.isWindowless = false;
        this.settings = {
            fontSize: 13,
            compactMode: false,
            autoScroll: true,
            saveHistory: true,
            showTimestamps: false
        };
        
        this.initializeElements();
        this.bindEvents();
        this.loadSettings();
        this.startSessionTimer();
        this.autoResizeTextarea();
        this.updateCurrentModelDisplay();
    }

    initializeElements() {
        // Core elements
        this.chatContainer = document.getElementById('chatContainer');
        this.modelSelect = document.getElementById('modelSelect');
        this.chatMessages = document.getElementById('chatMessages');
        this.messageInput = document.getElementById('messageInput');
        this.sendButton = document.getElementById('sendButton');
        this.speakButton = document.getElementById('speakButton');
        this.clearButton = document.getElementById('clearButton');
        this.statusBar = document.getElementById('connectionStatus');
        this.currentModelDisplay = document.getElementById('currentModelDisplay');
        this.currentPortDisplay = document.getElementById('currentPortDisplay');
        
        // New UI elements
        this.accordionToggle = document.getElementById('accordionToggle');
        this.settingsToggle = document.getElementById('settingsToggle');
        this.settingsPanel = document.getElementById('settingsPanel');
        this.exportChat = document.getElementById('exportChat');
        this.clearChat = document.getElementById('clearChat');
        this.wordCount = document.getElementById('wordCountValue');
        this.messageCountElement = document.getElementById('messageCount');
        this.sessionTime = document.getElementById('sessionTime');
        
        // Quick settings elements (the ones that actually exist)
        this.fontSizeSlider = document.getElementById('fontSizeSlider');
        this.compactMode = document.getElementById('compactMode');
        this.openFullSettings = document.getElementById('openFullSettings');
        
        // Model configs
        this.ollamaConfig = document.getElementById('ollamaConfig');
        this.llamacppConfig = document.getElementById('llamacppConfig');
        this.coquiConfig = document.getElementById('coquiConfig');
        
        // Model inputs
        this.ollamaUrl = document.getElementById('ollamaUrl');
        this.ollamaModel = document.getElementById('ollamaModel');
        this.ollamaWorkDir = document.getElementById('ollamaWorkDir');
        
        this.llamacppUrl = document.getElementById('llamacppUrl');
        this.llamacppWorkDir = document.getElementById('llamacppWorkDir');
        this.llamacppModelPath = document.getElementById('llamacppModelPath');
        this.llamacppPort = document.getElementById('llamacppPort');
        this.llamacppArgs = document.getElementById('llamacppArgs');
        
        this.coquiUrl = document.getElementById('coquiUrl');
        this.coquiModel = document.getElementById('coquiModel');
        this.coquiWorkDir = document.getElementById('coquiWorkDir');
        this.coquiPort = document.getElementById('coquiPort');
        this.coquiArgs = document.getElementById('coquiArgs');
        
        // Service controls
        this.ollamaStatus = document.getElementById('ollamaStatus');
        this.llamacppStatus = document.getElementById('llamacppStatus');
        this.coquiStatus = document.getElementById('coquiStatus');
    }

    bindEvents() {
        // Model selection
        this.modelSelect.addEventListener('change', (e) => this.switchModel(e.target.value));
        
        // Send message
        this.sendButton.addEventListener('click', () => this.sendMessage());
        this.messageInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });

        // Input auto-resize
        this.messageInput.addEventListener('input', () => this.autoResizeTextarea());

        // New UI controls
        this.accordionToggle.addEventListener('click', () => this.toggleAccordion());
        this.settingsToggle.addEventListener('click', () => this.toggleSettings());
        this.clearButton.addEventListener('click', () => this.clearChatConfirm());
        this.clearChat.addEventListener('click', () => this.clearChatConfirm());
        this.exportChat.addEventListener('click', () => this.exportChatHistory());

        // TTS
        this.speakButton.addEventListener('click', () => this.speakLastMessage());

        // Settings - only bind if elements exist
        if (this.fontSizeSlider) {
            this.fontSizeSlider.addEventListener('input', (e) => this.updateFontSize(e.target.value));
        }
        if (this.compactMode) {
            this.compactMode.addEventListener('change', (e) => this.toggleCompactMode(e.target.checked));
        }
        if (this.openFullSettings) {
            this.openFullSettings.addEventListener('click', () => this.showAdvancedSettingsMessage());
        }

        // Refresh buttons
        document.getElementById('refreshOllama').addEventListener('click', () => this.refreshOllamaModels());
        document.getElementById('refreshLlamacpp').addEventListener('click', () => this.testLlamaCppConnection());
        document.getElementById('refreshCoqui').addEventListener('click', () => this.refreshCoquiModels());

        // Service control buttons
        document.getElementById('ollamaStart').addEventListener('click', () => this.startService('ollama'));
        document.getElementById('ollamaStop').addEventListener('click', () => this.stopService('ollama'));
        document.getElementById('llamacppStart').addEventListener('click', () => this.startService('llamacpp'));
        document.getElementById('llamacppStop').addEventListener('click', () => this.stopService('llamacpp'));
        document.getElementById('coquiStart').addEventListener('click', () => this.startService('coqui'));
        document.getElementById('coquiStop').addEventListener('click', () => this.stopService('coqui'));

        // Electron controls
        document.getElementById('openClaude').addEventListener('click', () => window.electronAPI.openClaude());
        document.getElementById('minimize').addEventListener('click', () => window.electronAPI.minimizeWindow());
        document.getElementById('togglePin').addEventListener('click', async () => {
            const isOnTop = await window.electronAPI.toggleAlwaysOnTop();
            document.getElementById('togglePin').classList.toggle('active', isOnTop);
        });

        // URL changes
        this.ollamaUrl.addEventListener('change', () => this.refreshOllamaModels());
        this.llamacppUrl.addEventListener('change', () => this.testLlamaCppConnection());
        this.coquiUrl.addEventListener('change', () => this.refreshCoquiModels());
        
        // Save settings on input changes
        [this.ollamaWorkDir, this.llamacppWorkDir, this.llamacppModelPath, 
         this.llamacppPort, this.llamacppArgs, this.coquiWorkDir, 
         this.coquiPort, this.coquiArgs].forEach(input => {
            input.addEventListener('change', () => this.saveSettings());
        });

        // Close settings when clicking outside
        document.addEventListener('click', (e) => {
            if (this.settingsPanel && !this.settingsPanel.contains(e.target) && e.target !== this.settingsToggle) {
                this.settingsPanel.classList.remove('active');
            }
        });

        // Real-time word count
        this.messageInput.addEventListener('input', () => this.updateWordCount());

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey) {
                switch (e.key) {
                    case 'k':
                    case 'K':
                        e.preventDefault();
                        this.clearChatConfirm();
                        break;
                    case 'e':
                    case 'E':
                        e.preventDefault();
                        this.exportChatHistory();
                        break;
                    case 'm':
                    case 'M':
                        e.preventDefault();
                        this.toggleAccordion();
                        break;
                    case 't':
                    case 'T':
                        e.preventDefault();
                        this.toggleAlwaysOnTop();
                        break;
                }
            }
        });
    }

    loadSettings() {
        // Load from localStorage if available
        const savedSettings = localStorage.getItem('aiChatSettings');
        if (savedSettings) {
            const settings = JSON.parse(savedSettings);
            
            // UI settings
            this.settings = { ...this.settings, ...settings.ui };
            if (this.fontSizeSlider) this.fontSizeSlider.value = this.settings.fontSize;
            if (this.compactMode) this.compactMode.checked = this.settings.compactMode;
            
            // Apply settings
            this.updateFontSize(this.settings.fontSize);
            this.toggleCompactMode(this.settings.compactMode);
            
            // Service settings
            this.ollamaUrl.value = settings.ollamaUrl || 'http://localhost:11434';
            this.ollamaWorkDir.value = settings.ollamaWorkDir || '';
            
            this.llamacppUrl.value = settings.llamacppUrl || 'http://localhost:8080';
            this.llamacppWorkDir.value = settings.llamacppWorkDir || '';
            this.llamacppModelPath.value = settings.llamacppModelPath || '';
            this.llamacppPort.value = settings.llamacppPort || '8080';
            this.llamacppArgs.value = settings.llamacppArgs || '';
            
            this.coquiUrl.value = settings.coquiUrl || 'http://localhost:5002';
            this.coquiWorkDir.value = settings.coquiWorkDir || '';
            this.coquiPort.value = settings.coquiPort || '5002';
            this.coquiArgs.value = settings.coquiArgs || '';

            // Load chat history
            if (settings.chatHistory && this.settings.saveHistory) {
                this.currentConversation = settings.chatHistory;
                this.restoreChatHistory();
            }
        }
        
        this.switchModel('ollama');
        this.updateAllServiceStatuses();
        this.updateMessageCount();
        this.updateCurrentModelDisplay();
    }

    saveSettings() {
        const settings = {
            ui: this.settings,
            ollamaUrl: this.ollamaUrl.value,
            ollamaWorkDir: this.ollamaWorkDir.value,
            llamacppUrl: this.llamacppUrl.value,
            llamacppWorkDir: this.llamacppWorkDir.value,
            llamacppModelPath: this.llamacppModelPath.value,
            llamacppPort: this.llamacppPort.value,
            llamacppArgs: this.llamacppArgs.value,
            coquiUrl: this.coquiUrl.value,
            coquiWorkDir: this.coquiWorkDir.value,
            coquiPort: this.coquiPort.value,
            coquiArgs: this.coquiArgs.value,
            chatHistory: this.settings.saveHistory ? this.currentConversation : []
        };
        localStorage.setItem('aiChatSettings', JSON.stringify(settings));
    }

    // UI Enhancement Methods
    async toggleAccordion() {
        this.isMinimized = !this.isMinimized;
        
        // Update UI state
        this.chatContainer.classList.toggle('minimized', this.isMinimized);
        this.accordionToggle.textContent = this.isMinimized ? '📌' : '📍';
        this.accordionToggle.title = this.isMinimized ? 'Expand' : 'Minimize to Bar';
        
        // Actually resize the Electron window
        try {
            await window.electronAPI.toggleAccordion(this.isMinimized);
        } catch (error) {
            console.error('Failed to toggle accordion mode:', error);
            // Revert UI state if window resize failed
            this.isMinimized = !this.isMinimized;
            this.chatContainer.classList.toggle('minimized', this.isMinimized);
            this.accordionToggle.textContent = this.isMinimized ? '📌' : '📍';
        }
    }

    toggleSettings() {
        if (this.settingsPanel) {
            this.settingsPanel.classList.toggle('active');
        }
    }

    updateFontSize(size) {
        this.settings.fontSize = parseInt(size);
        this.chatMessages.style.fontSize = `${size}px`;
        this.saveSettings();
    }

    toggleCompactMode(enabled) {
        this.settings.compactMode = enabled;
        this.chatContainer.classList.toggle('compact', enabled);
        this.saveSettings();
    }

    clearChatConfirm() {
        if (confirm('Are you sure you want to clear the chat history?')) {
            this.performClearChat();
        }
    }

    performClearChat() {
        this.currentConversation = [];
        this.messageCount = 0;
        this.chatMessages.innerHTML = `
            <div class="message system">
                <div class="message-content">
                    🗑️ Chat cleared! Ready for a fresh conversation.
                    <div class="message-actions">
                        <button class="message-action-btn" onclick="aiChat.copyMessage(this)">📋</button>
                    </div>
                </div>
            </div>
        `;
        this.updateMessageCount();
        this.updateWordCount();
        this.saveSettings();
        
        // Add success message to system
        setTimeout(() => {
            this.addMessage('system', '✨ Chat history cleared successfully!');
        }, 500);
    }

    exportChatHistory() {
        if (this.currentConversation.length === 0) {
            this.addMessage('system', '📄 No chat history to export.');
            return;
        }

        const timestamp = new Date().toISOString().slice(0, 19).replace(/[:-]/g, '');
        const filename = `ai-chat-${timestamp}.json`;
        
        const exportData = {
            timestamp: new Date().toISOString(),
            model: this.currentModel,
            messageCount: this.messageCount,
            conversation: this.currentConversation
        };

        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        
        URL.revokeObjectURL(url);
        this.addMessage('system', `💾 Chat exported as ${filename}`);
    }

    copyMessage(button) {
        const messageContent = button.closest('.message-content');
        const text = messageContent.textContent.replace(/📋/g, '').trim();
        
        navigator.clipboard.writeText(text).then(() => {
            button.textContent = '✅';
            setTimeout(() => button.textContent = '📋', 1000);
        }).catch(() => {
            button.textContent = '❌';
            setTimeout(() => button.textContent = '📋', 1000);
        });
    }

    updateWordCount() {
        if (this.wordCount) {
            const words = this.messageInput.value.trim().split(/\s+/).filter(word => word.length > 0);
            this.wordCount.textContent = words.length || 0;
        }
    }

    updateMessageCount() {
        if (this.messageCountElement) {
            this.messageCountElement.textContent = `${this.messageCount} messages`;
        }
    }

    startSessionTimer() {
        setInterval(() => {
            const elapsed = Math.floor((Date.now() - this.sessionStartTime) / 1000);
            const minutes = Math.floor(elapsed / 60);
            const seconds = elapsed % 60;
            if (this.sessionTime) {
                this.sessionTime.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
            }
        }, 1000);
    }

    autoResizeTextarea() {
        this.messageInput.style.height = 'auto';
        this.messageInput.style.height = Math.min(this.messageInput.scrollHeight, 120) + 'px';
    }

    restoreChatHistory() {
        this.chatMessages.innerHTML = '';
        this.currentConversation.forEach(msg => {
            this.addMessage(msg.role, msg.content, false, false);
        });
        this.messageCount = this.currentConversation.filter(msg => msg.role !== 'system').length;
        this.updateMessageCount();
    }

    updateCurrentModelDisplay() {
        if (!this.currentModelDisplay) return;
        
        let modelText = 'No Model Selected';
        let portText = 'Port: N/A';
        
        switch (this.currentModel) {
            case 'ollama':
                const ollamaModel = this.ollamaModel.value;
                modelText = ollamaModel ? `🤖 ${ollamaModel}` : '🤖 Ollama (No Model)';
                portText = `Port: ${this.ollamaUrl.value.split(':').pop() || '11434'}`;
                break;
            case 'llamacpp':
                modelText = '🔧 Llama.cpp Server';
                portText = `Port: ${this.llamacppPort.value || '8080'}`;
                break;
            case 'coqui':
                const coquiModel = this.coquiModel.value;
                modelText = coquiModel ? `🔊 ${coquiModel}` : '🔊 Coqui-TTS';
                portText = `Port: ${this.coquiPort.value || '5002'}`;
                break;
        }
        
        this.currentModelDisplay.textContent = modelText;
        if (this.currentPortDisplay) {
            this.currentPortDisplay.textContent = portText;
        }
    }

    showAdvancedSettingsMessage() {
        this.addMessage('system', '⚙️ Advanced settings panel will be added in the next update! For now, you can configure AI services using the settings above each model section.');
    }

    async toggleAlwaysOnTop() {
        try {
            const isOnTop = await window.electronAPI.toggleAlwaysOnTop();
            document.getElementById('togglePin').classList.toggle('active', isOnTop);
        } catch (error) {
            console.error('Failed to toggle always on top:', error);
        }
    }

    // Enhanced message handling
    addMessage(role, content, isTyping = false, saveToHistory = true) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${role}`;
        
        const contentDiv = document.createElement('div');
        contentDiv.className = 'message-content';
        
        if (isTyping) {
            contentDiv.innerHTML = `
                <div class="typing-indicator">
                    <div class="typing-dot"></div>
                    <div class="typing-dot"></div>
                    <div class="typing-dot"></div>
                </div>
            `;
        } else {
            const timestamp = this.settings.showTimestamps ? 
                `<span style="opacity: 0.6; font-size: 10px; margin-left: 8px;">${new Date().toLocaleTimeString()}</span>` : '';
            
            contentDiv.innerHTML = `
                ${content}${timestamp}
                <div class="message-actions">
                    <button class="message-action-btn" onclick="aiChat.copyMessage(this)" title="Copy message">📋</button>
                </div>
            `;
            
            if (saveToHistory && role !== 'system') {
                this.messageCount++;
                this.updateMessageCount();
            }
        }
        
        messageDiv.appendChild(contentDiv);
        this.chatMessages.appendChild(messageDiv);
        
        if (this.settings.autoScroll) {
            this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
        }
        
        return messageDiv;
    }

    // Model switching and service methods
    switchModel(modelType) {
        this.currentModel = modelType;
        
        document.querySelectorAll('.model-config').forEach(config => {
            config.classList.remove('active');
        });
        
        const configId = `${modelType}Config`;
        document.getElementById(configId).classList.add('active');
        
        switch (modelType) {
            case 'ollama':
                this.refreshOllamaModels();
                break;
            case 'llamacpp':
                this.testLlamaCppConnection();
                break;
            case 'coqui':
                this.refreshCoquiModels();
                break;
        }
        
        this.updateCurrentModelDisplay();
        this.saveSettings();
    }

    async refreshOllamaModels() {
        this.updateStatus('connecting', '🔄 Connecting to Ollama...');
        
        try {
            const response = await fetch(`${this.ollamaUrl.value}/api/tags`);
            const data = await response.json();
            
            this.ollamaModel.innerHTML = '<option value="">Select Model</option>';
            data.models.forEach(model => {
                const option = document.createElement('option');
                option.value = model.name;
                option.textContent = model.name;
                this.ollamaModel.appendChild(option);
            });
            
            this.updateStatus('connected', '✅ Ollama connected');
            this.enableInput();
            this.updateCurrentModelDisplay();
            
        } catch (error) {
            this.updateStatus('error', `❌ Ollama connection failed: ${error.message}`);
            this.disableInput();
        }
    }

    async testLlamaCppConnection() {
        this.updateStatus('connecting', '🔄 Connecting to Llama.cpp...');
        
        try {
            const response = await fetch(`${this.llamacppUrl.value}/health`);
            if (response.ok) {
                this.updateStatus('connected', '✅ Llama.cpp connected');
                this.enableInput();
                this.updateCurrentModelDisplay();
            } else {
                throw new Error('Health check failed');
            }
        } catch (error) {
            this.updateStatus('error', `❌ Llama.cpp connection failed: ${error.message}`);
            this.disableInput();
        }
    }

    async refreshCoquiModels() {
        this.updateStatus('connecting', '🔄 Connecting to Coqui-TTS...');
        
        try {
            const response = await fetch(`${this.coquiUrl.value}/api/tts`);
            const data = await response.json();
            
            this.coquiModel.innerHTML = '<option value="">Select Model</option>';
            if (data.models) {
                data.models.forEach(model => {
                    const option = document.createElement('option');
                    option.value = model;
                    option.textContent = model;
                    this.coquiModel.appendChild(option);
                });
            }
            
            this.updateStatus('connected', '✅ Coqui-TTS connected');
            this.enableInput();
            this.updateCurrentModelDisplay();
            
        } catch (error) {
            this.updateStatus('error', `❌ Coqui-TTS connection failed: ${error.message}`);
            this.disableInput();
        }
    }

    updateStatus(status, message) {
        this.statusBar.className = status;
        this.statusBar.textContent = message;
        this.isConnected = status === 'connected';
    }

    enableInput() {
        this.messageInput.disabled = false;
        this.sendButton.disabled = false;
        this.clearButton.disabled = false;
        this.speakButton.disabled = this.currentModel !== 'coqui';
    }

    disableInput() {
        this.messageInput.disabled = true;
        this.sendButton.disabled = true;
        this.clearButton.disabled = true;
        this.speakButton.disabled = true;
    }

    async sendMessage() {
        const message = this.messageInput.value.trim();
        if (!message || !this.isConnected) return;

        this.addMessage('user', message);
        this.currentConversation.push({ role: 'user', content: message });
        
        this.messageInput.value = '';
        this.autoResizeTextarea();
        this.updateWordCount();
        
        const typingDiv = this.addMessage('assistant', '', true, false);
        
        try {
            let response;
            switch (this.currentModel) {
                case 'ollama':
                    response = await this.sendToOllama(message);
                    break;
                case 'llamacpp':
                    response = await this.sendToLlamaCpp(message);
                    break;
                case 'coqui':
                    response = await this.sendToCoqui(message);
                    break;
            }
            
            typingDiv.remove();
            this.addMessage('assistant', response);
            this.currentConversation.push({ role: 'assistant', content: response });
            this.saveSettings();
            
        } catch (error) {
            typingDiv.remove();
            this.addMessage('system', `❌ Error: ${error.message}`);
        }
    }

    async sendToOllama(message) {
        const selectedModel = this.ollamaModel.value;
        if (!selectedModel) throw new Error('Please select an Ollama model');
        
        const response = await fetch(`${this.ollamaUrl.value}/api/generate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: selectedModel,
                prompt: message,
                stream: false
            })
        });
        
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();
        return data.response;
    }

    async sendToLlamaCpp(message) {
        const response = await fetch(`${this.llamacppUrl.value}/completion`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                prompt: message,
                n_predict: 512,
                temperature: 0.7,
                stop: ["\n\n"]
            })
        });
        
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();
        return data.content;
    }

    async sendToCoqui(text) {
        const selectedModel = this.coquiModel.value;
        if (!selectedModel) throw new Error('Please select a TTS model');
        
        const response = await fetch(`${this.coquiUrl.value}/api/tts`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                text: text,
                model_name: selectedModel
            })
        });
        
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        
        const audioBlob = await response.blob();
        const audioUrl = URL.createObjectURL(audioBlob);
        const audio = new Audio(audioUrl);
        audio.play();
        
        return `🔊 Playing: "${text}"`;
    }

    async speakLastMessage() {
        if (this.currentModel !== 'coqui') return;
        
        const lastAssistantMessage = [...this.currentConversation]
            .reverse()
            .find(msg => msg.role === 'assistant');
            
        if (lastAssistantMessage) {
            await this.sendToCoqui(lastAssistantMessage.content);
        }
    }

    // Service management methods
    async startService(serviceType) {
        const config = this.getServiceConfig(serviceType);
        
        this.updateServiceStatus(serviceType, 'starting');
        
        try {
            const result = await window.electronAPI.startService(serviceType, config);
            
            if (result.success) {
                this.addMessage('system', `🚀 ${serviceType} started: ${result.message}`);
                this.updateServiceStatus(serviceType, 'running');
                
                setTimeout(() => {
                    switch (serviceType) {
                        case 'ollama':
                            this.refreshOllamaModels();
                            break;
                        case 'llamacpp':
                            this.testLlamaCppConnection();
                            break;
                        case 'coqui':
                            this.refreshCoquiModels();
                            break;
                    }
                }, 3000);
                
            } else {
                this.addMessage('system', `❌ Failed to start ${serviceType}: ${result.error}`);
                this.updateServiceStatus(serviceType, 'stopped');
            }
        } catch (error) {
            this.addMessage('system', `❌ Error starting ${serviceType}: ${error.message}`);
            this.updateServiceStatus(serviceType, 'stopped');
        }
    }

    async stopService(serviceType) {
        this.updateServiceStatus(serviceType, 'stopping');
        
        try {
            const result = await window.electronAPI.stopService(serviceType);
            
            if (result.success) {
                this.addMessage('system', `⏹️ ${serviceType} stopped: ${result.message}`);
                this.updateServiceStatus(serviceType, 'stopped');
                
                if (this.currentModel === serviceType) {
                    this.disableInput();
                    this.updateStatus('error', `${serviceType} service stopped`);
                }
            } else {
                this.addMessage('system', `❌ Failed to stop ${serviceType}: ${result.error}`);
            }
        } catch (error) {
            this.addMessage('system', `❌ Error stopping ${serviceType}: ${error.message}`);
        }
    }

    getServiceConfig(serviceType) {
        switch (serviceType) {
            case 'ollama':
                return {
                    workingDirectory: this.ollamaWorkDir.value || null,
                    port: '11434'
                };
            case 'llamacpp':
                return {
                    workingDirectory: this.llamacppWorkDir.value || null,
                    modelPath: this.llamacppModelPath.value,
                    port: this.llamacppPort.value || '8080',
                    additionalArgs: this.llamacppArgs.value || null
                };
            case 'coqui':
                return {
                    workingDirectory: this.coquiWorkDir.value || null,
                    port: this.coquiPort.value || '5002',
                    additionalArgs: this.coquiArgs.value || null
                };
            default:
                return {};
        }
    }

    updateServiceStatus(serviceType, status) {
        const statusElement = document.getElementById(`${serviceType}Status`);
        if (!statusElement) return;
        
        statusElement.className = `service-status ${status}`;
        
        switch (status) {
            case 'running':
                statusElement.textContent = '● Running';
                break;
            case 'stopped':
                statusElement.textContent = '● Stopped';
                break;
            case 'starting':
                statusElement.textContent = '● Starting...';
                break;
            case 'stopping':
                statusElement.textContent = '● Stopping...';
                break;
            default:
                statusElement.textContent = '● Unknown';
        }
    }

    async updateAllServiceStatuses() {
        for (const serviceType of ['ollama', 'llamacpp', 'coqui']) {
            try {
                const isRunning = await window.electronAPI.getServiceStatus(serviceType);
                this.updateServiceStatus(serviceType, isRunning ? 'running' : 'stopped');
            } catch (error) {
                this.updateServiceStatus(serviceType, 'unknown');
            }
        }
    }
}

// Global instance and functions
let aiChat;

function copyMessage(button) {
    aiChat.copyMessage(button);
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    aiChat = new AIChat();
});