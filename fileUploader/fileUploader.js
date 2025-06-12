import { LightningElement, api } from 'lwc';
import getFileSize from '@salesforce/apex/DocumentController.getFileSize';
import deleteOverSizeFiles from '@salesforce/apex/DocumentController.deleteDocuments';

export default class FileUploader extends LightningElement { 
    myRecordId = '';
    documentMap = {};
    showError = false;
    errorMessage = '';

    get acceptedFormats() {
        return ['.pdf', '.png', '.jpg', '.jpeg'];
    }

    handleUploadFinished(event) {
        const uploadedFiles = event.detail.files;
        if (!this.documentMap[this.documentName]) {
            this.documentMap[this.documentName] = [];
        }
        
        const documentIds = uploadedFiles.map(file => file.documentId);
        
        this.handleFileSizeCheck(documentIds)
            .then(result => {
                if (result.success) {
                    this.showError = false;
                    this.errorMessage = '';
                    
                    uploadedFiles.forEach(file => {
                        const documentId = file.documentId;
                        this.documentMap[this.documentName].push(documentId);
                    });
                    
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
        if (docIDs && docIDs.length > 0) {
            try {
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
                const result = await deleteOverSizeFiles({ contentDocumentIdToDelete: docIDs });
                if (result === 'Success') {
                    console.log('File Deletetion', result);
                } else {
                    console.error('Failed to delete files:', result);
                }
            } catch (error) {
                console.error('Error deleting oversized files:', error);
                if (error.body && error.body.message) {
                    console.error('Error message:', error.body.message);
                }
            }
        } else {
            console.log('No document IDs to delete');
        }
    }
}