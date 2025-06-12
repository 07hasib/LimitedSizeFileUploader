/**
* @File Name : DocumentController.cls
* @Description :
* @Author : Mohammad Hasib
* @Last Modified By :
* @Last Modified On : June 12, 2025
* @Modification Log :
*==============================================================================
* Ver | Date | Author | Modification
*==============================================================================
* 1.0 | June 12, 2025 |   | Initial Version
**/

public class DocumentController {
@AuraEnabled
    public static Map<Id, Long> getFileSize(List<Id> contentDocumentIds) {
    Map<Id, Long> fileSizeMap = new Map<Id, Long>();
    
    if (contentDocumentIds == null || contentDocumentIds.isEmpty()) {
        System.debug('No ContentDocument IDs provided');
        return fileSizeMap;
    }
    
    try {
        Set<Id> uniqueContentDocIds = new Set<Id>(contentDocumentIds);
        System.debug('Processing ' + uniqueContentDocIds.size() + ' unique file IDs');
        
        List<ContentDocument> docs = [SELECT Id, ContentSize, Title 
                                        FROM ContentDocument 
                                        WHERE Id IN :uniqueContentDocIds
                                        WITH SECURITY_ENFORCED];
        
        for (ContentDocument doc : docs) {
            fileSizeMap.put(doc.Id, doc.ContentSize);
        }
        
        return fileSizeMap;
    } catch (Exception e) {
        System.debug('Error while fetching file sizes: ' + e.getMessage());
        System.debug('StackTrace: ' + e.getStackTraceString());
        throw new AuraHandledException('Error retrieving file sizes: ' + e.getMessage());
    }
}

@AuraEnabled
    public static String deleteDocuments(List<Id> contentDocumentIdToDelete) {
        
      
        if (contentDocumentIdToDelete == null) {
            throw new AuraHandledException('ContentDocumentId cannot be null for deletion.');
        }
        
        try {
            
            List<ContentDocument> docs = [ SELECT Id FROM ContentDocument WHERE Id In:contentDocumentIdToDelete  ];
            if (!docs.isEmpty()) {
                delete docs;
            } else {
                throw new AuraHandledException('No ContentDocument found to delete.');
            }
            
            return 'Success';
        } catch (Exception e) {
            System.debug('Exception during file delete: ' + e.getMessage());
            System.debug('StackTrace: ' + e.getStackTraceString());
            throw new AuraHandledException(' Error: ' + e.getMessage());
        }
    }
}