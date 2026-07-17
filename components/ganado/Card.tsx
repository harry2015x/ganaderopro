type CardProps = {
    titulo: string;
    valor: string;
  };
  
  export default function Card({ titulo, valor }: CardProps) {
    return (
      <div className="rounded-2xl border border-green-100 bg-green-50 p-5 shadow-sm hover:shadow-lg transition-all duration-300">
  
        <p className="text-sm text-gray-500">
          {titulo}
        </p>
  
        <p className="mt-2 text-2xl font-bold text-green-800">
          {valor}
        </p>
  
      </div>
    );
  }