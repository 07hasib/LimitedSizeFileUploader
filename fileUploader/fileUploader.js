import { LightningElement, api } from 'lwc';
import getFileSize from '@salesforce/apex/EM_CreateContractorController.getFileSize';
import deleteOverSizeFiles from '@salesforce/apex/EM_CreateContractorController.deleteDocumentAndRelatedRecords';

export default class FileUploader extends LightningElement { 
    myRecordId = '';
    @api documentName;
    documentMap = {};
    showError = false;
    errorMessage = '';
    MAX_FILES_PER_DOCUMENT = 4;

    connectedCallback() {
        // Initialize the document map entry for this document name if it doesn't exist
        if (!this.documentMap[this.documentName]) {
            this.documentMap[this.documentName] = [];
        }
    }
    
    get acceptedFormats() {
        return ['.pdf', '.png', '.jpg', '.jpeg'];
    }
    
    get fileUploadLabel() {
        const currentCount = this.documentMap[this.documentName] ? this.documentMap[this.documentName].length : 0;
        const remaining = this.MAX_FILES_PER_DOCUMENT - currentCount;
        return `Upload Files (${currentCount}/${this.MAX_FILES_PER_DOCUMENT})`;
    }
    
    get isUploadDisabled() {
        const currentCount = this.documentMap[this.documentName] ? this.documentMap[this.documentName].length : 0;
        return currentCount >= this.MAX_FILES_PER_DOCUMENT;
    }

    handleUploadFinished(event) {
        const uploadedFiles = event.detail.files;
        if (!this.documentMap[this.documentName]) {
            this.documentMap[this.documentName] = [];
        }
        
        const documentIds = uploadedFiles.map(file => file.documentId);
        console.log(`Uploading ${documentIds.length} files for ${this.documentName}`);
        
        this.handleFileSizeCheck(documentIds)
            .then(result => {
                if (result.success) {
                    this.showError = false;
                    this.errorMessage = '';
                    
                    uploadedFiles.forEach(file => {
                        const documentId = file.documentId;
                        this.documentMap[this.documentName].push(documentId);
                    });
                    
                    console.log(`Document ${this.documentName} now has ${this.documentMap[this.documentName].length} files`);
                    
                    this.dispatchEvent(new CustomEvent('documentmapchange', {
                        detail: { documentMap: this.documentMap }
                    }));
                } else {
                    this.showError = true;
                    this.errorMessage = result.message;
                }
            })
            .catch(error => {
                this.showError = true;
                this.errorMessage = 'Error in file size check: ' + error.message;
            });
    }

    async handleFileSizeCheck(docIDs) {
        if (docIDs && docIDs.length > 4) {
            try {
                if (docIDs.length > 4) {
                    this.handleDeleteOverSizeFiles(docIDs);
                    return {
                        success: false,
                        message: `Maximum of 4 files allowed per upload. You are trying to upload ${docIDs.length} files.`
                    };
                }
                
                const currentFileCount = this.documentMap[this.documentName] ? this.documentMap[this.documentName].length : 0;
                if (currentFileCount + docIDs.length > 4) {
                    this.handleDeleteOverSizeFiles(docIDs);
                    return {
                        success: false,
                        message: `Maximum of 4 files allowed total. You already have ${currentFileCount} file(s).`
                    };
                }
                
                const fileSizeMap = await getFileSize({ contentDocumentIds: docIDs });
                console.log('File sizes:', fileSizeMap);
                
                const MAX_FILE_SIZE = 20 * 1024 * 1024; 
                let totalSize = 0;
                let oversizedFiles = [];
                
                for (let docId in fileSizeMap) {
                    if (fileSizeMap.hasOwnProperty(docId)) {
                        const fileSize = fileSizeMap[docId];
                        totalSize += fileSize;
                                                
                        if (fileSize > MAX_FILE_SIZE) {
                            oversizedFiles.push(docId);
                        }
                    }
                }
                
                const totalSizeMB = (totalSize / (1024 * 1024)).toFixed(2);
                
                if (totalSize > MAX_FILE_SIZE) {
                    this.handleDeleteOverSizeFiles(docIDs);
                    return {
                        success: false,
                        message: `Total File Upload Limit is 20MB you are uploading (${totalSizeMB} MB)`
                    };
                }
                
                if (oversizedFiles.length > 0) {
                    return {
                        success: false,
                        message: `One or more files exceed the maximum file size of 20MB`
                    };
                }
                
                return {
                    success: true,
                    message: 'File size check passed'
                };
                
            } catch (error) {
                console.error('Error fetching file size:', error);
                return {
                    success: false,
                    message: 'Error fetching file size: ' + error.message
                };
            }
        } else {
            return {
                success: true,
                message: 'No files to check'
            };
        }
    }

    async handleDeleteOverSizeFiles(docIDs) {
        if (docIDs && docIDs.length > 0) {
            try {
                console.log(`Deleting ${docIDs.length} files that exceed limits`);
                const result = await deleteOverSizeFiles({ contentDocumentIdToDelete: docIDs });
                if (result === 'Success') {
                    console.log('Files deleted successfully:', result);
                } else {
                    console.error('Failed to delete files:', result);
                }
            } catch (error) {
                console.error('Error deleting files:', error);
                if (error.body && error.body.message) {
                    console.error('Error message:', error.body.message);
                }
            }
        } else {
            console.log('No document IDs to delete');
        }
    }
}
