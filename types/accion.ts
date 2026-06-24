export interface Accion {

    id:number;

    titulo:string;

    descripcion:string;

    prioridad:"alta"|"media"|"baja";

    completada:boolean;

}