import { useState } from 'react';
import MapComponent from './MapComponent';
import AddFieldForm from './AddFieldForm';

const AddFieldSelection = () => {
  const [selectedField, setSelectedField] = useState(null);
  const [currentStep, setCurrentStep] = useState(1);

  return (
    <div className='flex flex-col'>
      <section className='grid flex-1 gap-4 overflow-auto p-4 md:grid-cols-2 lg:grid-cols-3'>
        <div className='relative flex-col gap-8 md:flex w-full'>
          <AddFieldForm
            currentStep={currentStep}
            selectedField={selectedField}
          />
        </div>
        <div className='relative flex h-full min-h-[80vh] flex-col rounded-xl bg-gray-300/50 p-4 lg:col-span-2'>
          <MapComponent
            selectedField={selectedField}
            setSelectedField={setSelectedField}
            setCurrentStep={setCurrentStep}
          />
        </div>
      </section>
    </div>
  );
};

export default AddFieldSelection;
