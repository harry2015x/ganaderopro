import { Animal } from "./animal";

export interface Pesaje {
  id: number;
  animal_id: number;
  fecha: string;
  peso: number;

  animal?: Animal;
}