sap.ui.define([
    "sap/m/MessageToast",
    "sap/m/MessageBox",
], function (MessageToast, MessageBox) {
    'use strict';

    return {

        onInit: function () {
            this.attachEventsToTable();
            this.addCustomToolbarContent();
        },

        attachEventsToTable: function () {
            let oTable = this.getView().byId(this.getView().getId() + '--listReport').getTable(),
                oPlugin = oTable.getPlugins()[0];

            if (oPlugin) {
                oPlugin.attachSelectionChange(this.onRowSelectionChange, this);
            }
        },

        onRowSelectionChange: function (oEvent) {
            let sActionsEnabled = false,
                oModel = this.getOwnerComponent().getModel(),
                oToolbarContent = this.getView().byId(this.getView().getId() + '--listReport').getToolbar().getContent(),
                oContextSelected = this.extensionAPI.getSelectedContexts();

            if (oContextSelected && oContextSelected.length > 0) {
                let sPath = oContextSelected[0].getPath(),
                    sObjeto = oModel.getProperty(sPath);
                if (oContextSelected.length > 0 && sObjeto.IsMapaOk === 'S' && sObjeto.IsPesoOk === 'S') {
                    sActionsEnabled = true;
                }
            }

            for (var i = 0; i < oToolbarContent.length; i++) {
                // O Botão da Ação 'Print' é controlado pelo Behavior do Serviço, na classe ZBP_EWM_R_MAPA_CARREGA_PRINT
                // Aqui só controlamos o botão da Ação 'PDFCreate'
                if (oToolbarContent[i].sId.includes('mapa--PDFCreateButton')) {
                    oToolbarContent[i].setEnabled(sActionsEnabled);
                }
            }
        },

        addCustomToolbarContent: function () {
            // Pega a toolbar da tabela
            let oToolbar = this.getView().byId(this.getView().getId() + '--listReport').getToolbar(),
                oToolbarContent = oToolbar.getContent();


            for (var i = 0; i < oToolbarContent.length; i++) {
                if (oToolbarContent[i].sId.includes('mapa--PDFCreateButton')) {
                    oToolbarContent[i].setIcon('sap-icon://pdf-attachment');
                }
                if (oToolbarContent[i].sId.includes('mapa--action::cds_zsdui_ewm_c_mapa_carrega_print.cds_zsdui_ewm_c_mapa_carrega_print_Entities::print')) {
                    oToolbarContent[i].setIcon('sap-icon://print');
                }
            }
        },

        onAfterRendering: function () {
            let oTable = this.getView().byId(this.getView().getId() + '--listReport').getTable();
            if (oTable) {
                // 1º coluna fixa
                oTable.setFixedColumnCount(1);
            }
        },

        onBeforeRebindTableExtension: function (oEvent) {
            let oBindingParams = oEvent.getParameter("bindingParams");

            oBindingParams.parameters = oBindingParams.parameters || {};

            // let qtdFiltrosAplicados = this.byId(oEvent.getSource().getSmartFilterId()).getAllFiltersWithValues().length;

            // if (oEvent.getSource().getTable().getRows()
            //     && oEvent.getSource().getTable().getRows().length > 0
            //     && qtdFiltrosAplicados
            //     && qtdFiltrosAplicados > 0) {
            //     // Das próximas vezes, apenas filtra os dados já carregados.
            //     oBindingParams.parameters.operationMode = "Client";
            // } else {
            //     // Da primeira vez, busca toda a Base de Dados do Servidor de acordo com o critério de seleção
            //     oBindingParams.parameters.operationMode = "Server";
            // }

            oBindingParams.parameters.treeAnnotationProperties = {
                hierarchyLevelFor: "HierarchyLevel",
                hierarchyNodeFor: "NodeID",
                hierarchyParentNodeFor: "ParentNodeID",
                hierarchyDrillStateFor: "DrillState"
            };

            // Para TreeTable começar Colapsado
            oBindingParams.parameters.numberOfExpandedLevels = 0;
            // Para TreeTable continuar Colapsado após Filtro
            oEvent.getSource().getTable().collapseAll();

        },

        PDFCreate: function (oEvent) {
            let oModel = this.getOwnerComponent().getModel(),
                oModeli18n = this.getOwnerComponent().getModel("i18n"),
                oContextSelected = this.extensionAPI.getSelectedContexts(),
                sPath = oContextSelected[0].getPath(),
                sObjeto = oModel.getProperty(sPath),
                sRequest = '/pdf',
                that = this;

            let oKeys = {
                "NodeID": sObjeto.NodeID
            };

            this.getView().setBusy(true);

            oModel.callFunction(sRequest, {
                method: "POST",
                urlParameters: oKeys,
                success: function (oData, oResponse) {
                    that.getView().setBusy(false);
                    that.downloadFile(JSON.parse(oResponse.body), oModeli18n);

                }.bind(this),
                error: function (oError) {
                    that.getView().setBusy(false);
                    var oErro = JSON.parse(oError.responseText);
                    oErro = oErro.error.message.value;
                    MessageBox.error(oErro);
                }.bind(this)
            });

        },

        downloadFile: function (pResult, pModeli18n) {

            var i18nTexts = pModeli18n.getResourceBundle();

            if (pResult.d.pdf.file_content === null || pResult.d.pdf.file_content === "") {
                MessageBox.error(i18nTexts.getText("FormError"));
                return;
            }

            try {
                // Decodificar Base64
                var byteCharacters = atob(pResult.d.pdf.file_content);
                var byteNumbers = new Array(byteCharacters.length);
                for (var i = 0; i < byteCharacters.length; i++) {
                    byteNumbers[i] = byteCharacters.charCodeAt(i);
                }
                var byteArray = new Uint8Array(byteNumbers);

                // Criar Blob
                var blob = new Blob([byteArray], {
                    type: pResult.d.pdf.mime_type
                });

                // Download
                var link = document.createElement('a');
                link.href = window.URL.createObjectURL(blob);
                link.download = pResult.d.pdf.file_name;
                link.style.display = 'none';
                document.body.appendChild(link);
                link.click();

                // Cleanup
                setTimeout(function () {
                    document.body.removeChild(link);
                    window.URL.revokeObjectURL(link.href);
                }, 100);

                return true;
            } catch (error) {
                MessageBox.error(i18nTexts.getText("DownloadError") + error.message);
            }

        },
    }
});
