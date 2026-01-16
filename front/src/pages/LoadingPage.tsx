import { InfinitySpin } from 'react-loader-spinner';

const LoadingPage = () => {
    return (
        <div className="flex items-center justify-center min-h-screen">
            <div className="text-center">
                <InfinitySpin
                    width="200"
                    color="#3b82f6"
                />
                <p className="mt-4 text-gray-600">Загрузка приложения...</p>
            </div>
        </div>
    )
}

export default LoadingPage