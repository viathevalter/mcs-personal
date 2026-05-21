
import type {
    SPClient, SPPedido, SPWorker, SPReemplazo, SPReubicacion, SPObra
} from '../../../types/sp_mirror';

/**
 * Definição dos nomes "sujos" das colunas do SharePoint.
 * Centraliza a string mágica para facilitar manutenção caso o SP mude.
 */
const COLS = {
    COMMON: {
        ID: 'ID',
        CREATED: 'Created',
        MODIFIED: 'Modified',
        TITLE: 'Title'
    },
    CLIENT: {
        COMPANY: 'Company_x0020_Group',
        INDUSTRY: 'Industry_x0020_Type',
        STATUS: 'Account_x0020_Status',
        NIF: 'Tax_x0020_ID',
        EMAIL: 'Email',
        PHONE: 'WorkPhone'
    },
    WORKER: {
        FULL_NAME: 'Full_x0020_Name',
        DOC_NUM: 'Doc_x0020_Number',
        CATEGORY: 'Job_x0020_Category',
        NATIONALITY: 'Nationality',
        STATUS: 'Worker_x0020_Status',
        EMAIL: 'Email',
        PHONE: 'MobilePhone'
    },
    PEDIDO: {
        CODE: 'Order_x0020_Code',
        CLIENT_ID: 'ClientLookupId',
        SITE_ID: 'ConstructionSiteId',
        START_DATE: 'Start_x0020_Date',
        STATUS: 'OData__Status',
        SALES_EMAIL: 'Sales_x0020_Rep_x0020_Email'
    },
    OBRA: {
        CODE: 'Site_x0020_Code',
        NAME: 'Site_x0020_Name',
        CLIENT_ID: 'ClientLookupId',
        LOCATION: 'Geo_x0020_Location',
        STATUS: 'Project_x0020_Status'
    },
    REEMPLAZO: {
        CODE: 'Ref_x0020_Code',
        CLIENT_ID: 'ClientLookupId',
        ORDER_ID: 'OrderLookupId',
        OLD_WORKER_ID: 'OldWorkerId',
        NEW_WORKER_ID: 'NewWorkerId',
        REASON: 'Replacement_x0020_Reason',
        REQ_DATE: 'Request_x0020_Date',
        STATUS: 'Approval_x0020_Status'
    },
    REUBICACION: {
        CODE: 'Move_x0020_Ref',
        CLIENT_ID: 'ClientLookupId',
        ORDER_ID: 'OrderLookupId',
        WORKER_ID: 'WorkerLookupId',
        SITE_FROM: 'OriginSiteId',
        SITE_TO: 'DestSiteId',
        REASON: 'Move_x0020_Reason',
        MOVE_DATE: 'Movement_x0020_Date',
        STATUS: 'Logistics_x0020_Status'
    }
};

/**
 * Facade de Mapeamento.
 * Recebe um objeto `any` (Raw do SharePoint) e devolve o tipo tipado.
 */
export const spMappers = {

    toClient: (raw: any): SPClient => ({
        id: raw.uuid || crypto.randomUUID(), // ID interno app
        sp_id: raw[COLS.COMMON.ID],
        sp_created: raw[COLS.COMMON.CREATED],
        sp_modified: raw[COLS.COMMON.MODIFIED],
        name: raw[COLS.COMMON.TITLE],
        company: raw[COLS.CLIENT.COMPANY],
        industry: raw[COLS.CLIENT.INDUSTRY],
        nif: raw[COLS.CLIENT.NIF],
        status: raw[COLS.CLIENT.STATUS],
        email: raw[COLS.CLIENT.EMAIL],
        phone: raw[COLS.CLIENT.PHONE]
    }),

    toWorker: (raw: any): SPWorker => ({
        id: raw.uuid || crypto.randomUUID(),
        sp_id: raw[COLS.COMMON.ID],
        sp_created: raw[COLS.COMMON.CREATED],
        sp_modified: raw[COLS.COMMON.MODIFIED],
        nome: raw[COLS.WORKER.FULL_NAME],
        documento: raw[COLS.WORKER.DOC_NUM],
        nacionalidade: raw[COLS.WORKER.NATIONALITY],
        categoria_profissional: raw[COLS.WORKER.CATEGORY],
        status: raw[COLS.WORKER.STATUS],
        email: raw[COLS.WORKER.EMAIL],
        phone: raw[COLS.WORKER.PHONE]
    }),

    toPedido: (raw: any): SPPedido => ({
        id: raw.uuid || crypto.randomUUID(),
        sp_id: raw[COLS.COMMON.ID],
        sp_created: raw[COLS.COMMON.CREATED],
        sp_modified: raw[COLS.COMMON.MODIFIED],
        codigo: raw[COLS.PEDIDO.CODE],
        client_sp_id: raw[COLS.PEDIDO.CLIENT_ID],
        obra_sp_id: raw[COLS.PEDIDO.SITE_ID],
        data_inicio: raw[COLS.PEDIDO.START_DATE],
        status: raw[COLS.PEDIDO.STATUS],
        comercial_email: raw[COLS.PEDIDO.SALES_EMAIL]
    }),

    toObra: (raw: any): SPObra => ({
        id: raw.uuid || crypto.randomUUID(),
        sp_id: raw[COLS.COMMON.ID],
        sp_created: raw[COLS.COMMON.CREATED],
        sp_modified: raw[COLS.COMMON.MODIFIED],
        codigo: raw[COLS.OBRA.CODE],
        nome: raw[COLS.OBRA.NAME],
        client_sp_id: raw[COLS.OBRA.CLIENT_ID],
        localizacao: raw[COLS.OBRA.LOCATION],
        status: raw[COLS.OBRA.STATUS]
    }),

    toReemplazo: (raw: any): SPReemplazo => ({
        id: raw.uuid || crypto.randomUUID(),
        sp_id: raw[COLS.COMMON.ID],
        sp_created: raw[COLS.COMMON.CREATED],
        sp_modified: raw[COLS.COMMON.MODIFIED],
        codigo: raw[COLS.REEMPLAZO.CODE],
        client_sp_id: raw[COLS.REEMPLAZO.CLIENT_ID],
        pedido_sp_id: raw[COLS.REEMPLAZO.ORDER_ID],
        worker_old_sp_id: raw[COLS.REEMPLAZO.OLD_WORKER_ID],
        worker_new_sp_id: raw[COLS.REEMPLAZO.NEW_WORKER_ID],
        motivo: raw[COLS.REEMPLAZO.REASON],
        data_solicitacao: raw[COLS.REEMPLAZO.REQ_DATE],
        status: raw[COLS.REEMPLAZO.STATUS]
    }),

    toReubicacion: (raw: any): SPReubicacion => ({
        id: raw.uuid || crypto.randomUUID(),
        sp_id: raw[COLS.COMMON.ID],
        sp_created: raw[COLS.COMMON.CREATED],
        sp_modified: raw[COLS.COMMON.MODIFIED],
        codigo: raw[COLS.REUBICACION.CODE],
        client_sp_id: raw[COLS.REUBICACION.CLIENT_ID],
        pedido_sp_id: raw[COLS.REUBICACION.ORDER_ID],
        worker_sp_id: raw[COLS.REUBICACION.WORKER_ID],
        obra_from_sp_id: raw[COLS.REUBICACION.SITE_FROM],
        obra_to_sp_id: raw[COLS.REUBICACION.SITE_TO],
        motivo: raw[COLS.REUBICACION.REASON],
        data_movimento: raw[COLS.REUBICACION.MOVE_DATE],
        status: raw[COLS.REUBICACION.STATUS]
    })
};
